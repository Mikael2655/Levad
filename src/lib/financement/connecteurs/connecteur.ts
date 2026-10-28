// Interface commune à tous les financeurs. Chaque financeur a son connecteur ; le reste de l'application ne parle qu'à cette interface.
//  - manuel      : l'outil enregistre, une personne saisit chez le financeur et met le statut à jour à la main (version actuelle)
//  - grenke_api  : appels directs à l'API de Grenke (en cours de construction : lecture seule pour l'instant)
//  - plus tard   : BNP Leasing Solutions, Locam...
import type { Statut } from '../droits'
import type { EtapeSignature } from '../etapes'

export interface RetourDemande {
  referenceFinanceur: string // identifiant de la demande chez le financeur
}

export interface EtatDemande {
  statut: Statut
  etapeSignature: EtapeSignature | null
  detail: string // libellé précis donné par le financeur
  codeFinanceur: string // code brut du financeur (ex. ReadyToSign)
}

export interface ContratFinanceur {
  reference: string
  etatBrut: string
  client: string
  loyerMensuelCentimes: number | null
  dureeMois: number
  montantFinanceCentimes: number | null
  dateDebut: Date | null
  dateFin: Date | null
}

export interface Connecteur {
  readonly code: string
  creerDemande(demandeId: number): Promise<RetourDemande>
  recupererStatut(referenceFinanceur: string): Promise<EtatDemande | null>
  envoyerPiece(referenceFinanceur: string, nomFichier: string, contenu: Buffer): Promise<void>
  lancerSignature(referenceFinanceur: string, signataires: { client: Signataire[]; fournisseur: Signataire[] }): Promise<void>
  recupererContratSigne(referenceFinanceur: string): Promise<Buffer | null>
  listerContrats(): Promise<ContratFinanceur[]>
}

export interface Signataire {
  prenom: string
  nom: string
  email: string
  mobile?: string
}
