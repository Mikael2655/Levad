// Règles de droits et « vues » des données. Fonctions pures, appelées par TOUTES les routes et pages :
// c'est ici (côté serveur) que l'on décide qui voit quoi, jamais dans l'affichage.

export type Role = 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL'

export interface Acteur {
  id: number
  role: Role
}

export const STATUTS = [
  'BROUILLON',
  'ENVOYEE', // envoyée au financeur, à l'étude
  'INFOS_MANQUANTES',
  'PRETE_A_SIGNER', // accord
  'REFUSEE',
  'EN_SIGNATURE',
  'SIGNEE',
  'ANNULEE',
] as const
export type Statut = (typeof STATUTS)[number]

// Statuts dans lesquels le contenu d'une demande peut encore être modifié (hors admin).
const STATUTS_MODIFIABLES: Statut[] = ['BROUILLON', 'INFOS_MANQUANTES']

export const estAdmin = (a: Acteur) => a.role === 'ADMIN'
export const estInterne = (a: Acteur) => a.role === 'ADMIN' || a.role === 'ASSISTANTE'

interface Possedee {
  commercialId: number
}
interface AvecStatut extends Possedee {
  statut: string
}

export const peutVoir = (a: Acteur, d: Possedee) => estInterne(a) || d.commercialId === a.id
export const peutVoirBaremeReel = (a: Acteur) => estInterne(a)
export const peutVoirMarge = (a: Acteur) => estInterne(a) // l'assistante voit les deux barèmes : la marge s'en déduit
export const peutChoisirCommercial = (a: Acteur) => estInterne(a)
export const peutGererUtilisateursEtGrilles = (a: Acteur) => estAdmin(a)
export const peutSupprimer = (a: Acteur) => estAdmin(a)
export const peutModifierContrat = (a: Acteur) => estInterne(a)
export const peutImporterContrats = (a: Acteur) => estInterne(a)

export function peutModifier(a: Acteur, d: AvecStatut): boolean {
  // une demande signée est devenue un contrat : c'est le contrat qu'on corrige (peutModifierContrat)
  if (!peutVoir(a, d) || d.statut === 'ANNULEE' || d.statut === 'SIGNEE') return false
  if (estAdmin(a)) return true
  return (STATUTS_MODIFIABLES as string[]).includes(d.statut)
}

// Annuler : l'admin toute demande ; le commercial la sienne tant qu'elle est en brouillon ; l'assistante jamais.
export function peutAnnuler(a: Acteur, d: AvecStatut): boolean {
  if (d.statut === 'ANNULEE') return false
  if (estAdmin(a)) return true
  return a.role === 'COMMERCIAL' && d.commercialId === a.id && d.statut === 'BROUILLON'
}

// Archiver (la demande disparaît de la liste) : admin et assistante pour toute demande, le commercial pour les siennes.
export const peutArchiver = (a: Acteur, d: Possedee) => peutVoir(a, d)

// Renseigner le n° de dossier chez le financeur (donnée réelle, que le commercial ne voit jamais) : réservé à l'interne.
// Le changement de statut lui-même est ouvert à tous sur les demandes visibles (voir statuts.ts).
export const peutChangerStatut = (a: Acteur) => estInterne(a)

// --- Vues : ce qui est réellement envoyé au navigateur ---------------------------------------------------------------

export interface DemandeBase {
  id: number
  reference: string
  creeLe: Date
  majLe: Date
  statut: string
  archivee: boolean
  infosManquantes: string | null
  etapeSignature: string | null
  refFinanceur: string | null
  financeurId: number
  commercialId: number
  saisiParId: number
  raisonSociale: string
  siret: string
  formeJuridique: string | null
  adresse: string
  codePostal: string | null
  ville: string | null
  pays: string
  contactPrenom: string
  contactNom: string
  contactEmail: string
  contactTel: string | null
  dureeMois: number
  periodicite: string
  loyerCentimes: number
  montantCommercialCentimes: number
  coefficientCommercialPpm: number
  montantReelCentimes: number | null // vide pour un financeur sans barème réel tant qu'il n'a pas communiqué le vrai montant
  coefficientReelPpm: number | null
  horsTranche: boolean
}

// Vue commerciale : construite champ par champ (liste blanche). Un champ ajouté plus tard à la table
// ne sera jamais envoyé à un commercial tant qu'on ne l'a pas ajouté ici volontairement.
export function vueCommerciale(d: DemandeBase) {
  return {
    id: d.id,
    reference: d.reference,
    creeLe: d.creeLe,
    majLe: d.majLe,
    statut: d.statut,
    archivee: d.archivee,
    infosManquantes: d.infosManquantes,
    etapeSignature: d.etapeSignature,
    financeurId: d.financeurId,
    commercialId: d.commercialId,
    saisiParId: d.saisiParId,
    raisonSociale: d.raisonSociale,
    siret: d.siret,
    formeJuridique: d.formeJuridique,
    adresse: d.adresse,
    codePostal: d.codePostal,
    ville: d.ville,
    pays: d.pays,
    contactPrenom: d.contactPrenom,
    contactNom: d.contactNom,
    contactEmail: d.contactEmail,
    contactTel: d.contactTel,
    dureeMois: d.dureeMois,
    periodicite: d.periodicite,
    loyerCentimes: d.loyerCentimes,
    montantCommercialCentimes: d.montantCommercialCentimes,
    coefficientCommercialPpm: d.coefficientCommercialPpm,
  }
}

export type DemandeVueCommerciale = ReturnType<typeof vueCommerciale>
export type DemandeVueInterne = DemandeBase & { margeCentimes: number | null }

export function vueDemande(a: Acteur, d: DemandeBase): DemandeVueCommerciale | DemandeVueInterne {
  if (peutVoirBaremeReel(a)) return { ...d, margeCentimes: d.montantReelCentimes == null ? null : d.montantReelCentimes - d.montantCommercialCentimes }
  return vueCommerciale(d)
}

export interface ContratBase {
  id: number
  creeLe: Date
  demandeId: number | null
  importe: boolean
  refFinanceur: string | null
  statutFinanceur: string | null
  financeurId: number
  commercialId: number
  raisonSociale: string
  siret: string | null
  materiel: string
  periodicite: string
  dureeMois: number
  loyerCentimes: number
  dateDebut: Date | null
  dateFin: Date | null
  montantCommercialCentimes: number | null
  montantReelCentimes: number | null
  banque: string | null
  denonceLe: Date | null
  clotureLe: Date | null
  clotureMotif: string | null
}

export function vueContrat(a: Acteur, c: ContratBase) {
  if (peutVoirBaremeReel(a)) return { ...c, margeCentimes: c.montantCommercialCentimes == null || c.montantReelCentimes == null ? null : c.montantReelCentimes - c.montantCommercialCentimes }
  return {
    id: c.id,
    creeLe: c.creeLe,
    demandeId: c.demandeId,
    importe: c.importe,
    financeurId: c.financeurId,
    commercialId: c.commercialId,
    raisonSociale: c.raisonSociale,
    siret: c.siret,
    materiel: c.materiel,
    periodicite: c.periodicite,
    dureeMois: c.dureeMois,
    loyerCentimes: c.loyerCentimes,
    dateDebut: c.dateDebut,
    dateFin: c.dateFin,
    montantCommercialCentimes: c.montantCommercialCentimes,
    denonceLe: c.denonceLe,
    clotureLe: c.clotureLe,
  }
}

// --- Vue d'un calcul (aperçu du loyer dans le formulaire) ---------------------------------------------------------------

export interface ResultatCalcul {
  dureesDisponibles: number[]
  resultat: {
    loyerCentimes: number
    commercial: { montantCentimes: number; coefficientPpm: number; horsTranche: boolean }
    reel: { montantCentimes: number; coefficientPpm: number; horsTranche: boolean } | null // null : financeur sans barème réel
    margeCentimes: number | null
  } | null
}

// Le commercial ne reçoit que son calcul ; l'interne reçoit les deux et la marge.
export function vueCalcul(a: Acteur, c: ResultatCalcul) {
  if (peutVoirBaremeReel(a)) return c
  return {
    dureesDisponibles: c.dureesDisponibles,
    resultat: c.resultat && {
      loyerCentimes: c.resultat.loyerCentimes,
      commercial: { montantCentimes: c.resultat.commercial.montantCentimes, coefficientPpm: c.resultat.commercial.coefficientPpm },
    },
  }
}
