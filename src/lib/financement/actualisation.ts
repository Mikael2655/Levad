// « Actualiser depuis le financeur » : lit l'état de la demande chez le financeur (API) et met à jour le statut de l'outil.
// Réservé à l'interne. Ne crée jamais de contrat : un état « signé » est signalé, l'enregistrement reste manuel.
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { connecteurPour } from './connecteurs'
import { estInterne, type Acteur } from './droits'
import { ErreurMetier } from './erreurs'
import { notifierChangement } from './notifications'

const APPLICABLES = ['ENVOYEE', 'INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'REFUSEE', 'EN_SIGNATURE']
const MODIFIABLES = ['ENVOYEE', 'INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'EN_SIGNATURE', 'REFUSEE']

// Cœur commun : lit l'état chez le financeur et met la demande à jour. auteurId : auteur inscrit à l'historique ;
// notifierActeurId : null = changement automatique (les notifications le précisent).
async function appliquerEtatFinanceur(demandeId: number, auteurId: number | null, notifierActeurId: number | null) {
  const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, include: { financeur: true } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  const c = connecteurPour(d.financeur.connecteur)
  if (!c) throw new ErreurMetier('Ce financeur n’a pas d’interface automatique (ou la configuration est incomplète).')
  if (!d.idFinanceur || d.idFinanceur === 'ENVOI-EN-COURS') throw new ErreurMetier('Cette demande n’a pas été envoyée par l’API : rien à actualiser.')

  const etat = await c.recupererStatut(d.idFinanceur)
  if (!etat) return { modifie: false, message: 'État renvoyé par le financeur non reconnu : aucun changement. Signalez-le pour qu’on l’ajoute.' }

  const donnees: Record<string, unknown> = {}
  if (etat.reference && etat.reference !== d.refFinanceur) donnees.refFinanceur = etat.reference

  let message = `État chez le financeur : ${etat.detail} (${etat.codeFinanceur}).`
  const etapeApres = etat.statut === 'EN_SIGNATURE' ? etat.etapeSignature : null
  let statutChange = etat.statut !== d.statut || etapeApres !== d.etapeSignature
  // Pièces déjà transmises après la demande d'informations : le financeur peut afficher « informations manquantes » un moment encore,
  // on garde « en attente » (gris) au lieu de repasser en orange.
  if (statutChange && etat.statut === 'INFOS_MANQUANTES' && d.statut === 'ENVOYEE') {
    const derniere = await prisma.finHistorique.findFirst({ where: { demandeId, nouveauStatut: 'INFOS_MANQUANTES' }, orderBy: { date: 'desc' }, select: { date: true } })
    const depuis = derniere?.date ?? null
    if (depuis && (await prisma.finPieceJointe.count({ where: { demandeId, envoyeFinanceurLe: { gt: depuis } } })) > 0) {
      statutChange = false
      message += ' Les pièces ont été transmises : en attente de la réponse du financeur.'
    }
  }
  if (statutChange) {
    if (!MODIFIABLES.includes(d.statut)) message += ' Le statut de la demande n’est pas modifié (demande déjà signée, annulée ou en brouillon).'
    else if (!APPLICABLES.includes(etat.statut)) message += ' Ce nouvel état (signature terminée, par exemple) n’est pas appliqué automatiquement : enregistrez-le vous-même.'
    else {
      donnees.statut = etat.statut
      donnees.etapeSignature = etapeApres
      donnees.infosManquantes = etat.statut === 'INFOS_MANQUANTES' ? d.infosManquantes ?? etat.detail : null
    }
  }
  if (Object.keys(donnees).length === 0) return { modifie: false, message: `${message} Aucun changement.` }

  const operations: Prisma.PrismaPromise<unknown>[] = [prisma.finDemande.update({ where: { id: demandeId }, data: donnees })]
  if (donnees.statut) operations.push(prisma.finHistorique.create({ data: { demandeId, auteurId: auteurId ?? d.saisiParId, ancienStatut: d.statut, nouveauStatut: String(donnees.statut), commentaire: `${notifierActeurId === null ? 'Mise à jour automatique' : 'Mise à jour'} depuis ${d.financeur.nom} : ${etat.detail}` } }))
  await prisma.$transaction(operations)
  if (donnees.statut) await notifierChangement({ demandeId, acteurId: notifierActeurId, statutAvant: d.statut, etapeAvant: d.etapeSignature, statutApres: String(donnees.statut), etapeApres })
  return { modifie: true, message }
}

export async function actualiserDepuisFinanceur(a: Acteur, demandeId: number) {
  if (!estInterne(a)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
  return appliquerEtatFinanceur(demandeId, a.id, a.id)
}

// --- Automatique ---------------------------------------------------------------------------------------------------------
// Les demandes en cours se mettent à jour toutes seules : à l'ouverture d'une fiche ou de la liste (au plus toutes les quelques minutes),
// et chaque nuit (tâche planifiée). Une erreur de réseau ne bloque jamais l'affichage.

const OUVERTES = ['ENVOYEE', 'INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'EN_SIGNATURE']

async function peutRafraichir(cle: string, minutes: number, maintenant = new Date()): Promise<boolean> {
  const p = await prisma.finParametre.findUnique({ where: { cle } })
  if (p && maintenant.getTime() - new Date(p.valeur).getTime() < minutes * 60_000) return false
  await prisma.finParametre.upsert({ where: { cle }, create: { cle, valeur: maintenant.toISOString() }, update: { valeur: maintenant.toISOString() } })
  return true
}

const avecDelai = <T,>(p: Promise<T>, ms: number): Promise<T | null> => Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))])

export async function actualiserSiPerime(demandeId: number, minutes = 5): Promise<void> {
  try {
    const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, select: { statut: true, idFinanceur: true } })
    if (!d?.idFinanceur || d.idFinanceur === 'ENVOI-EN-COURS' || !OUVERTES.includes(d.statut)) return
    if (!(await peutRafraichir(`actu:d:${demandeId}`, minutes))) return
    await avecDelai(appliquerEtatFinanceur(demandeId, null, null), 6000)
  } catch (e) {
    console.error('Actualisation automatique de la demande', demandeId, (e as Error).message)
  }
}

// Toutes les demandes en cours reliées à un financeur avec API. force : sans tenir compte du délai (tâche de nuit).
export async function actualiserToutesLesDemandesOuvertes(options: { force?: boolean; minutes?: number; delaiMs?: number } = {}): Promise<{ verifiees: number; modifiees: number }> {
  const resultat = { verifiees: 0, modifiees: 0 }
  try {
    if (!options.force && !(await peutRafraichir('actu:global', options.minutes ?? 10))) return resultat
    const demandes = await prisma.finDemande.findMany({ where: { statut: { in: OUVERTES }, archivee: false, idFinanceur: { not: null }, NOT: { idFinanceur: 'ENVOI-EN-COURS' } }, select: { id: true }, take: 100 })
    const travail = Promise.all(demandes.map(async x => {
      try { const r = await appliquerEtatFinanceur(x.id, null, null); resultat.verifiees++; if (r.modifie) resultat.modifiees++ } catch (e) { console.error('Actualisation automatique de la demande', x.id, (e as Error).message) }
    }))
    await avecDelai(travail, options.delaiMs ?? 8000)
  } catch (e) {
    console.error('Actualisation automatique des demandes', (e as Error).message)
  }
  return resultat
}

// Rattache une demande de l'outil à un dossier DÉJÀ créé chez le financeur (par exemple saisi à la main sur son portail),
// d'après son numéro. Vérifie que le dossier correspond (montant et durée), puis met le statut à jour.
export async function rattacherAuFinanceur(a: Acteur, demandeId: number, reference: string) {
  if (!estInterne(a)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
  const ref = reference.trim()
  if (!ref) throw new ErreurMetier('Indiquez le numéro de dossier du financeur (ex. 100-145711).')
  const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, include: { financeur: true } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  const c = connecteurPour(d.financeur.connecteur)
  if (!c?.trouverDemande) throw new ErreurMetier('Ce financeur n’a pas d’interface automatique (ou la configuration est incomplète).')
  if (d.idFinanceur) throw new ErreurMetier('Cette demande est déjà reliée à un dossier du financeur.', 409)
  const autre = await prisma.finDemande.findFirst({ where: { financeurId: d.financeurId, refFinanceur: ref, NOT: { id: demandeId } }, select: { reference: true } })
  if (autre) throw new ErreurMetier(`Ce numéro de dossier est déjà utilisé par la demande ${autre.reference}.`, 409)

  const x = await c.trouverDemande(ref)
  if (!x) throw new ErreurMetier(`Aucun dossier « ${ref} » trouvé chez ${d.financeur.nom}. Vérifiez le numéro.`, 404)
  const problemes: string[] = []
  if (d.montantReelCentimes != null && x.montantCentimes != null && Math.abs(x.montantCentimes - d.montantReelCentimes) > 100) problemes.push(`montant ${(x.montantCentimes / 100).toLocaleString('fr-FR')} € chez le financeur, ${(d.montantReelCentimes / 100).toLocaleString('fr-FR')} € ici`)
  if (x.dureeMois != null && x.dureeMois !== d.dureeMois) problemes.push(`durée ${x.dureeMois} mois chez le financeur, ${d.dureeMois} ici`)
  if (problemes.length) throw new ErreurMetier(`Ce dossier (${x.client}) ne correspond pas à cette demande : ${problemes.join(' ; ')}. Rien n’a été modifié.`)

  await prisma.$transaction([
    prisma.finDemande.update({ where: { id: demandeId }, data: { idFinanceur: x.id, refFinanceur: x.reference } }),
    prisma.finHistorique.create({ data: { demandeId, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: d.statut, commentaire: `Rattachée au dossier ${x.reference} de ${d.financeur.nom}` } }),
  ])
  const r = await actualiserDepuisFinanceur(a, demandeId)
  return { modifie: true, message: `Rattachée au dossier ${x.reference} (${x.client}). ${r.message}` }
}
