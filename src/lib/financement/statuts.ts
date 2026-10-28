// Statuts communs à tous les financeurs et passages autorisés de l'un à l'autre.
import { peutAnnuler, peutVoir, type Acteur, type Statut } from './droits'

export const LIBELLES_STATUT: Record<Statut, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyée au financeur',
  INFOS_MANQUANTES: 'Informations manquantes',
  PRETE_A_SIGNER: 'Prête à signer',
  REFUSEE: 'Refusée',
  EN_SIGNATURE: 'En signature',
  SIGNEE: 'Signée',
  ANNULEE: 'Annulée',
}

const TRANSITIONS: Record<Statut, Statut[]> = {
  BROUILLON: ['ENVOYEE', 'ANNULEE'],
  ENVOYEE: ['INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'REFUSEE', 'ANNULEE'],
  INFOS_MANQUANTES: ['ENVOYEE', 'PRETE_A_SIGNER', 'REFUSEE', 'ANNULEE'],
  PRETE_A_SIGNER: ['EN_SIGNATURE', 'ANNULEE'],
  REFUSEE: ['BROUILLON', 'ANNULEE'],
  EN_SIGNATURE: ['SIGNEE', 'PRETE_A_SIGNER', 'ANNULEE'],
  SIGNEE: [],
  ANNULEE: [],
}

// Statuts que l'acteur peut choisir à la main depuis la fiche : tout utilisateur pour les demandes qu'il peut voir
// (un commercial mène ses demandes jusqu'au bout sans validation). « En signature » passe par le formulaire des
// signataires, pas par un simple bouton. L'annulation suit les règles de droits (admin ; commercial sur son brouillon).
export function statutsAccessibles(a: Acteur, d: { statut: string; commercialId: number }): Statut[] {
  const suivants = TRANSITIONS[d.statut as Statut] ?? []
  return suivants.filter(s => {
    if (s === 'ANNULEE') return peutAnnuler(a, d)
    if (s === 'EN_SIGNATURE') return false
    return peutVoir(a, d)
  })
}

// Tous les utilisateurs, pour les demandes qu'ils voient.
export const peutEnvoyerEnSignature = (a: Acteur, d: { statut: string; commercialId: number }) => peutVoir(a, d) && d.statut === 'PRETE_A_SIGNER'
