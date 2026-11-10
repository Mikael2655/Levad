// Avant d'enregistrer (et d'envoyer) une demande : y a-t-il déjà des demandes en cours ou des contrats en cours pour ce client ?
// Rapprochement par SIREN (9 premiers chiffres du SIRET) ou, à défaut, par raison sociale identique.
// Un commercial ne voit le détail que de SES dossiers : pour les autres, on signale seulement qu'il en existe (pas de fuite entre commerciaux).
import { prisma } from '@/lib/db'
import { statutContrat } from './echeances'
import { estInterne, type Acteur } from './droits'

const normaliser = (s: string) => s.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '')
const STATUTS_EN_COURS = ['BROUILLON', 'ENVOYEE', 'INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'EN_SIGNATURE']

export interface DoublonDemande { id: number; reference: string; statut: string; financeur: string; creeLe: Date; commercial: string }
export interface DoublonContrat { id: number; reference: string | null; financeur: string; loyerCentimes: number; periodicite: string; dateFin: Date | null; etat: 'EN_COURS' | 'TACITE'; commercial: string }

export async function rechercherDoublons(a: Acteur, p: { siret: string; raisonSociale: string; exclureDemandeId?: number | null }) {
  const siren = p.siret.replace(/\D/g, '').slice(0, 9)
  const nom = normaliser(p.raisonSociale)
  const aSiren = siren.length === 9
  if (!aSiren && nom.length < 3) return { demandes: [], contrats: [], autres: 0 }

  const [demandes, contrats] = await Promise.all([
    prisma.finDemande.findMany({
      where: { statut: { in: STATUTS_EN_COURS }, archivee: false, ...(p.exclureDemandeId ? { id: { not: p.exclureDemandeId } } : {}), ...(aSiren ? { OR: [{ siret: { startsWith: siren } }, { raisonSociale: { equals: p.raisonSociale, mode: 'insensitive' as const } }] } : { raisonSociale: { equals: p.raisonSociale, mode: 'insensitive' as const } }) },
      include: { financeur: { select: { nom: true } }, commercial: { select: { prenom: true, nom: true } } },
      orderBy: { id: 'desc' }, take: 20,
    }),
    prisma.finContrat.findMany({
      where: { clotureLe: null, ...(aSiren ? { OR: [{ siret: { startsWith: siren } }, { raisonSociale: { equals: p.raisonSociale, mode: 'insensitive' as const } }] } : { raisonSociale: { equals: p.raisonSociale, mode: 'insensitive' as const } }) },
      include: { financeur: { select: { nom: true } }, commercial: { select: { prenom: true, nom: true } } },
      orderBy: { id: 'desc' }, take: 20,
    }),
  ])
  const visible = (commercialId: number) => estInterne(a) || commercialId === a.id
  const mesDemandes = demandes.filter(d => visible(d.commercialId))
  const contratsEnCours = contrats.filter(c => statutContrat(c) !== 'CLOTURE')
  const mesContrats = contratsEnCours.filter(c => visible(c.commercialId))
  return {
    demandes: mesDemandes.map((d): DoublonDemande => ({ id: d.id, reference: d.reference, statut: d.statut, financeur: d.financeur.nom, creeLe: d.creeLe, commercial: `${d.commercial.prenom} ${d.commercial.nom}` })),
    contrats: mesContrats.map((c): DoublonContrat => ({ id: c.id, reference: c.refFinanceur, financeur: c.financeur.nom, loyerCentimes: c.loyerCentimes, periodicite: c.periodicite, dateFin: c.dateFin, etat: statutContrat(c) as 'EN_COURS' | 'TACITE', commercial: `${c.commercial.prenom} ${c.commercial.nom}` })),
    autres: demandes.length - mesDemandes.length + contratsEnCours.length - mesContrats.length, // dossiers d'autres commerciaux : non détaillés
  }
}
