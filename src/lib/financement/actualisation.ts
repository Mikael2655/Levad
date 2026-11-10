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

export async function actualiserDepuisFinanceur(a: Acteur, demandeId: number) {
  if (!estInterne(a)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
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
  const statutChange = etat.statut !== d.statut || etapeApres !== d.etapeSignature
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
  if (donnees.statut) operations.push(prisma.finHistorique.create({ data: { demandeId, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: String(donnees.statut), commentaire: `Mise à jour depuis ${d.financeur.nom} : ${etat.detail}` } }))
  await prisma.$transaction(operations)
  if (donnees.statut) await notifierChangement({ demandeId, acteurId: a.id, statutAvant: d.statut, etapeAvant: d.etapeSignature, statutApres: String(donnees.statut), etapeApres })
  return { modifie: true, message }
}
