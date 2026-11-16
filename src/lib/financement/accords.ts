// Accord reçu d'un financeur SANS API (Solubail...) : par e-mail / PDF. On en retient le vrai montant financé (confidentiel : admin et assistante),
// jamais le PDF. Les commerciaux voient seulement le statut « Prête à signer » : leur montant reste celui du barème commercial.
// Un nouvel accord (coefficient négocié) peut remplacer le précédent à tout moment avant la signature : chaque accord est conservé (interne).
import { prisma } from '@/lib/db'
import { grilleReelle } from './admin'
import { estInterne, type Acteur } from './droits'
import { ErreurMetier } from './erreurs'
import { notifierChangement } from './notifications'

export async function enregistrerAccord(a: Acteur, demandeId: number, p: { montantReelCentimes: number; note?: string | null }) {
  if (!estInterne(a)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
  const montant = p.montantReelCentimes
  if (!Number.isInteger(montant) || montant <= 0) throw new ErreurMetier('Montant financé invalide.')
  const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, include: { financeur: true } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  if (d.financeur.connecteur === 'grenke_api' || (await grilleReelle(d.financeurId))) throw new ErreurMetier('L’accord de ce financeur est calculé ou reçu par son interface : il n’est pas saisi à la main.')
  if (!['ENVOYEE', 'INFOS_MANQUANTES', 'PRETE_A_SIGNER'].includes(d.statut)) throw new ErreurMetier('L’accord ne peut être enregistré que tant que la demande n’est pas en signature.', 409)
  // garde-fou contre une faute de frappe : le vrai montant reste du même ordre que le montant commercial
  if (montant < d.montantCommercialCentimes * 0.5 || montant > d.montantCommercialCentimes * 2) throw new ErreurMetier('Ce montant est très éloigné du montant de la demande : vérifiez-le (en euros, avec les centimes).')

  const premier = d.statut !== 'PRETE_A_SIGNER'
  const coefficientReelPpm = Math.round((d.loyerCentimes * 1_000_000) / montant)
  const note = p.note?.trim().slice(0, 300) || null
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id: demandeId }, data: { montantReelCentimes: montant, coefficientReelPpm, ...(premier ? { statut: 'PRETE_A_SIGNER', infosManquantes: null, etapeSignature: null } : {}) } }),
    prisma.finAccord.create({ data: { demandeId, auteurId: a.id, montantReelCentimes: montant, coefficientReelPpm, note } }),
    // le commentaire d'historique est vu des commerciaux : aucun montant réel dedans
    prisma.finHistorique.create({ data: { demandeId, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: 'PRETE_A_SIGNER', commentaire: premier ? `Accord reçu de ${d.financeur.nom}` : `Accord mis à jour (${d.financeur.nom})` } }),
  ])
  if (premier) await notifierChangement({ demandeId, acteurId: a.id, statutAvant: d.statut, etapeAvant: d.etapeSignature, statutApres: 'PRETE_A_SIGNER', etapeApres: null })
  return { ok: true, premier }
}

// Historique des accords d'une demande : interne uniquement.
export async function listerAccords(a: Acteur, demandeId: number) {
  if (!estInterne(a)) return []
  const l = await prisma.finAccord.findMany({ where: { demandeId }, orderBy: { id: 'desc' }, include: { auteur: { select: { prenom: true, nom: true } } } })
  return l.map(x => ({ id: x.id, creeLe: x.creeLe, montantReelCentimes: x.montantReelCentimes, coefficientReelPpm: x.coefficientReelPpm, note: x.note, auteurNom: `${x.auteur.prenom} ${x.auteur.nom}` }))
}
