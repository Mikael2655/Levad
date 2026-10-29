// Couche d'accès aux demandes : les pages et routes passent TOUJOURS par ici, jamais par prisma directement.
// Le filtre « un commercial ne voit que ses demandes » est dans la requête SQL, et la réponse passe par vueDemande.
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { estInterne, vueDemande, type Acteur } from './droits'

export interface FiltresDemandes {
  statut?: string
  financeurId?: number
  commercialId?: number // ignoré pour un commercial
  du?: Date
  au?: Date
  archivees?: boolean
}

function conditions(acteur: Acteur, f: FiltresDemandes): Prisma.FinDemandeWhereInput {
  return {
    ...(estInterne(acteur) ? (f.commercialId ? { commercialId: f.commercialId } : {}) : { commercialId: acteur.id }),
    archivee: f.archivees ?? false,
    // une demande signée est devenue un contrat : elle ne figure plus parmi les demandes en cours (sauf recherche explicite)
    statut: f.statut ? f.statut : { not: 'SIGNEE' },
    ...(f.financeurId ? { financeurId: f.financeurId } : {}),
    ...(f.du || f.au ? { creeLe: { ...(f.du ? { gte: f.du } : {}), ...(f.au ? { lte: f.au } : {}) } } : {}),
  }
}

const NOMS = { commercial: { select: { prenom: true, nom: true } }, financeur: { select: { nom: true, connecteur: true, signatureElectronique: true, envoiParMail: true } } } as const

export async function listerDemandes(acteur: Acteur, f: FiltresDemandes = {}) {
  const lignes = await prisma.finDemande.findMany({ where: conditions(acteur, f), orderBy: { creeLe: 'desc' }, include: { ...NOMS, lignes: { orderBy: { id: 'asc' }, select: { designation: true, quantite: true } } } })
  return lignes.map(({ commercial, financeur, lignes: materiel, ...d }) => ({
    ...vueDemande(acteur, d),
    commercialNom: `${commercial.prenom} ${commercial.nom}`,
    commercialAffiche: `${commercial.prenom} ${commercial.nom.slice(0, 1)}.`,
    materiel: materiel.map(l => (l.quantite > 1 ? `${l.quantite} × ` : '') + l.designation).join(' ; '),
    financeurNom: financeur.nom,
  }))
}

// Compteurs du tableau de bord : mêmes filtres que la liste, sauf le statut.
export async function compterParStatut(acteur: Acteur, f: FiltresDemandes = {}): Promise<Record<string, number>> {
  const groupes = await prisma.finDemande.groupBy({ by: ['statut'], where: conditions(acteur, { ...f, statut: undefined }), _count: { _all: true } })
  return Object.fromEntries(groupes.map(g => [g.statut, g._count._all]))
}

// null si la demande n'existe pas OU si l'acteur n'a pas le droit de la voir (même réponse : on ne révèle rien).
export async function lireDemande(acteur: Acteur, id: number) {
  const d = await prisma.finDemande.findFirst({
    where: { id, ...(estInterne(acteur) ? {} : { commercialId: acteur.id }) },
    include: {
      ...NOMS,
      saisiPar: { select: { prenom: true, nom: true } },
      lignes: { orderBy: { id: 'asc' } },
      pieces: { where: { complete: true }, orderBy: { id: 'asc' }, include: { ajoutePar: { select: { prenom: true, nom: true } } } },
      historique: { orderBy: { date: 'asc' }, include: { auteur: { select: { prenom: true, nom: true } } } },
      signature: true,
      rachat: { include: { contrat: { select: { id: true, raisonSociale: true } } } },
    },
  })
  if (!d) return null
  const { commercial, financeur, saisiPar, lignes, pieces, historique, signature, rachat, ...base } = d
  // information réservée à l'interne : un commercial n'a pas à savoir s'il existe un barème réel
  const sansBaremeReel = !(await prisma.finGrille.findFirst({ where: { financeurId: base.financeurId, type: 'REELLE' }, select: { id: true } }))
  return {
    ...vueDemande(acteur, base),
    commercialNom: `${commercial.prenom} ${commercial.nom}`,
    financeurNom: financeur.nom,
    signatureElectronique: financeur.signatureElectronique,
    financeurAvecApi: financeur.connecteur === 'grenke_api',
    envoiParMail: financeur.envoiParMail,
    ...(estInterne(acteur) ? { sansBaremeReel } : {}),
    saisiParNom: `${saisiPar.prenom} ${saisiPar.nom}`,
    lignes: lignes.map(l => ({ id: l.id, designation: l.designation, quantite: l.quantite, montantHtCentimes: l.montantHtCentimes, typeBien: l.typeBien, constructeur: l.constructeur })),
    pieces: pieces.map(p => ({ id: p.id, type: p.type, nomFichier: p.nomFichier, taille: p.taille, ajouteLe: p.ajouteLe, ajouteParId: p.ajouteParId, envoyeFinanceurLe: p.envoyeFinanceurLe, ajouteParNom: `${p.ajoutePar.prenom} ${p.ajoutePar.nom}` })),
    // historique : on n'expose que le nom de l'auteur (jamais son adresse e-mail)
    historique: historique.map(h => ({ id: h.id, date: h.date, ancienStatut: h.ancienStatut, nouveauStatut: h.nouveauStatut, commentaire: h.commentaire, auteurNom: `${h.auteur.prenom} ${h.auteur.nom}` })),
    signature,
    // renouvellement : le solde est visible du commercial (total seulement, jamais la valeur résiduelle ni la pénalité)
    rachat: rachat ? { id: rachat.id, type: rachat.type, dateResiliation: rachat.dateResiliation, totalCentimes: rachat.totalCentimes, statut: rachat.statut, contratId: rachat.contrat.id, contratClient: rachat.contrat.raisonSociale } : null,
  }
}
