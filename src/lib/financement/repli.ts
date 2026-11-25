// Demande de repli : si Grenke refuse (ou bloque faute de pièces), la même demande est faite chez Solubail.
//  - refus de Grenke : création AUTOMATIQUE chez Solubail (appelée par la mise à jour automatique des statuts) ;
//  - « informations manquantes » : jamais automatique, l'utilisateur la crée lui-même (bouton sur la fiche) quand il juge les pièces difficiles à obtenir.
// La demande de repli reprend client, matériel, loyer et durée ; elle est envoyée à Solubail par e-mail comme toute demande Solubail.
// Les deux demandes restent reliées ; l'autre est annulée à la main quand l'une obtient l'accord.
import { prisma } from '@/lib/db'
import { type Acteur, estInterne } from './droits'
import { creerDemande, type EntreeDemande } from './demandes'
import { ErreurMetier } from './erreurs'
import { envoyerALaCreation } from './envoi-creation'
import { numeroAffiche } from './numero'

export async function financeurDeRepli() {
  return prisma.finFinanceur.findFirst({ where: { nom: { equals: 'Solubail', mode: 'insensitive' }, actif: true, envoiParMail: true } })
}

const LIBELLE_STATUT: Record<string, string> = { REFUSEE: 'refusée', INFOS_MANQUANTES: 'bloquée (pièces demandées)' }

export async function creerDemandeRepli(origineId: number, o: { declencheur: 'AUTO' | 'MANUEL'; auteur?: Acteur }) {
  const origine = await prisma.finDemande.findUnique({ where: { id: origineId }, include: { lignes: { orderBy: { id: 'asc' } }, financeur: true, replis: { where: { statut: { not: 'ANNULEE' } }, select: { id: true, reference: true } } } })
  if (!origine) throw new ErreurMetier('Demande introuvable.', 404)
  if (o.auteur && !estInterne(o.auteur)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
  if (origine.financeur.connecteur !== 'grenke_api' || origine.repliDeId) throw new ErreurMetier('Cette demande n’est pas une demande Grenke d’origine.', 409)
  const autorises = o.declencheur === 'AUTO' ? ['REFUSEE'] : ['REFUSEE', 'INFOS_MANQUANTES']
  if (!autorises.includes(origine.statut)) throw new ErreurMetier('Une demande de repli ne se crée que sur une demande refusée ou en attente de pièces.', 409)
  if (origine.replis.length > 0) throw new ErreurMetier(`Une demande de repli existe déjà (${origine.replis[0].reference}).`, 409)
  const cible = await financeurDeRepli()
  if (!cible) throw new ErreurMetier('Aucun financeur de repli (Solubail) n’est configuré.', 404)
  const admin = await prisma.finUtilisateur.findFirst({ where: { role: 'ADMIN', actif: true }, orderBy: { id: 'asc' } })
  if (!admin) throw new ErreurMetier('Aucun administrateur actif.')
  const acteur: Acteur = { id: admin.id, role: 'ADMIN' }

  const entree: EntreeDemande = {
    financeurId: cible.id, commercialId: origine.commercialId,
    raisonSociale: origine.raisonSociale, siret: origine.siret, formeJuridique: origine.formeJuridique, adresse: origine.adresse, codePostal: origine.codePostal, ville: origine.ville, pays: origine.pays,
    contactPrenom: origine.contactPrenom, contactNom: origine.contactNom, contactEmail: origine.contactEmail, contactTel: origine.contactTel,
    dureeMois: origine.dureeMois, periodicite: origine.periodicite as EntreeDemande['periodicite'], loyerCentimes: origine.loyerCentimes, montantCentimes: null,
    rachatId: null, // un solde de contrat ne s'intègre qu'à une demande : il reste sur la demande d'origine
    observation: origine.observation,
    lignes: origine.lignes.map(l => ({ designation: l.designation, quantite: l.quantite, montantHtCentimes: l.montantHtCentimes, typeBien: null, constructeur: l.constructeur })), // types de bien Grenke sans objet chez Solubail
  }
  let creee: { id: number; reference: string }
  try {
    creee = await creerDemande(acteur, entree)
  } catch (e) {
    throw new ErreurMetier(`Demande ${cible.nom} non créée : ${(e as Error).message}`, (e as ErreurMetier).status ?? 400)
  }
  const numeroOrigine = numeroAffiche(origine, origine.financeur)
  const comment = o.declencheur === 'AUTO' ? `Demande de repli créée automatiquement : ${numeroOrigine} ${LIBELLE_STATUT[origine.statut]} chez ${origine.financeur.nom}` : `Demande de repli créée à la demande de l’utilisateur : ${numeroOrigine} ${LIBELLE_STATUT[origine.statut]} chez ${origine.financeur.nom}`
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id: creee.id }, data: { repliDeId: origine.id } }),
    prisma.finHistorique.create({ data: { demandeId: creee.id, auteurId: acteur.id, nouveauStatut: 'BROUILLON', commentaire: comment } }),
    prisma.finHistorique.create({ data: { demandeId: origine.id, auteurId: o.auteur?.id ?? acteur.id, ancienStatut: origine.statut, nouveauStatut: null, commentaire: `Demande de repli créée chez ${cible.nom} (${creee.reference})` } }),
  ])
  const envoi = await envoyerALaCreation(acteur, creee.id) // « Envoyée » + récapitulatif par e-mail au destinataire Solubail
  return { id: creee.id, reference: creee.reference, financeur: cible.nom, envoi: envoi.envoi, message: envoi.message }
}

// Refus constaté par la mise à jour automatique : on tente la demande de repli sans jamais faire échouer la mise à jour du statut.
export async function repliAutomatiqueApresRefus(origineId: number): Promise<void> {
  try {
    if (!(await financeurDeRepli())) return // fonction non configurée : rien à faire
    await creerDemandeRepli(origineId, { declencheur: 'AUTO' })
  } catch (e) {
    if (e instanceof ErreurMetier && e.status === 409) return // déjà créée, ou pas une demande d'origine
    const admin = await prisma.finUtilisateur.findFirst({ where: { role: 'ADMIN', actif: true }, orderBy: { id: 'asc' }, select: { id: true } })
    if (admin) await prisma.finHistorique.create({ data: { demandeId: origineId, auteurId: admin.id, nouveauStatut: null, commentaire: `Demande de repli non créée automatiquement : ${(e as Error).message}`.slice(0, 500) } }).catch(() => {})
  }
}
