// Étapes détaillées d'une signature : le statut commun reste « En signature », cette étape précise où en est le dossier.
// Saisie à la main avec le connecteur manuel ; renseignée automatiquement par le connecteur Grenke (voir connecteurs/grenke/statuts.ts).
export const ETAPES_SIGNATURE = ['DEMARRAGE', 'ATTENTE_CLIENT', 'ATTENTE_LEVAD', 'CONTRAT_EMIS', 'ATTENTE_LIVRAISON'] as const
export type EtapeSignature = (typeof ETAPES_SIGNATURE)[number]

export const LIBELLES_ETAPE: Record<EtapeSignature, string> = {
  DEMARRAGE: 'Démarrage de la signature',
  ATTENTE_CLIENT: 'En attente de la signature du client',
  ATTENTE_LEVAD: 'En attente de la signature de LEVAD',
  CONTRAT_EMIS: 'Contrat émis',
  ATTENTE_LIVRAISON: 'En attente de la confirmation de livraison',
}

export const libelleEtape = (e: string | null | undefined) => (e ? (LIBELLES_ETAPE as Record<string, string>)[e] ?? null : null)
