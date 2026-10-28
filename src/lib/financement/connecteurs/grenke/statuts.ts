// Correspondance entre les états de Grenke (API Leasing) et les statuts communs de l'outil.
import type { Statut } from '../../droits'
import type { EtapeSignature } from '../../etapes'

export interface Correspondance {
  statut: Statut
  etape: EtapeSignature | null // précision quand le statut est « En signature »
  detail: string // libellé précis, en français
}

const TABLE: Record<string, Correspondance> = {
  RequestToGrenke: { statut: 'ENVOYEE', etape: null, detail: 'Transmise à Grenke' },
  ApplicationReceived: { statut: 'ENVOYEE', etape: null, detail: 'Reçue par Grenke' },
  MissingInfo: { statut: 'INFOS_MANQUANTES', etape: null, detail: 'Informations manquantes' },
  GuaranteeRequired: { statut: 'INFOS_MANQUANTES', etape: null, detail: 'Garantie demandée par Grenke' },
  ReadyToSign: { statut: 'PRETE_A_SIGNER', etape: null, detail: 'Accord : prête à signer' },
  Declined: { statut: 'REFUSEE', etape: null, detail: 'Refusée par Grenke' },
  Cancelled: { statut: 'ANNULEE', etape: null, detail: 'Annulée' },
  Contracted: { statut: 'SIGNEE', etape: null, detail: 'Contrat signé' },
  StartingESignature: { statut: 'EN_SIGNATURE', etape: 'DEMARRAGE', detail: 'Démarrage de la signature' },
  AwaitingCustomerSignature: { statut: 'EN_SIGNATURE', etape: 'ATTENTE_CLIENT', detail: 'En attente de la signature du client' },
  AwaitingPartnerSignature: { statut: 'EN_SIGNATURE', etape: 'ATTENTE_LEVAD', detail: 'En attente de la signature de LEVAD' },
  AwaitingSigningAppSignature: { statut: 'EN_SIGNATURE', etape: null, detail: 'En attente de signature (application de signature)' },
  ContractPrinted: { statut: 'EN_SIGNATURE', etape: 'CONTRAT_EMIS', detail: 'Contrat émis' },
  ContractPrintedBeforeStatement: { statut: 'EN_SIGNATURE', etape: 'CONTRAT_EMIS', detail: 'Contrat émis' },
  AwaitingDeliveryConfirmation: { statut: 'EN_SIGNATURE', etape: 'ATTENTE_LIVRAISON', detail: 'En attente de la confirmation de livraison' },
  CancellingESignature: { statut: 'EN_SIGNATURE', etape: null, detail: 'Annulation de la signature en cours' },
}

// null = état à ignorer (« None ») ou inconnu : on ne touche alors pas au statut de la demande.
export const versStatutCommun = (etatGrenke: string): Correspondance | null => TABLE[etatGrenke] ?? null

export const ETATS_GRENKE_CONNUS = Object.keys(TABLE)

// États d'un CONTRAT chez Grenke (distincts des états d'une demande).
export const LIBELLES_ETAT_CONTRAT: Record<string, string> = {
  RunningContract: 'En cours',
  ApplicationSettled: 'Dossier réglé',
  ExpiringSoon: 'Arrive à échéance',
  ProlongedContract: 'Prolongé',
  Expired: 'Échu',
  Rescinded: 'Résilié',
  Cancelled: 'Annulé',
  Paid: 'Soldé',
  Unknown: 'Inconnu',
}
