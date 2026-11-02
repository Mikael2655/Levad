// Correspondance entre les états de Grenke (API Leasing) et les statuts communs de l'outil.
import type { Statut } from '../../droits'
import type { EtapeSignature } from '../../etapes'

export interface Correspondance {
  statut: Statut
  etape: EtapeSignature | null // précision quand le statut est « En signature »
  detail: string // libellé précis, en français
}

export const TABLE: Record<string, Correspondance> = {
  RequestToGrenke: { statut: 'ENVOYEE', etape: null, detail: 'Transmise à Grenke' },
  // « Dossier réglable » : famille « Mise en place du contrat » du portail (tous les éléments sont reçus), pas l'étape de réception de la demande
  ApplicationReceived: { statut: 'SIGNEE', etape: null, detail: 'Dossier réglable' },
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
  // « Contrat imprimé avant accord de financement » : famille « Devis » du portail, la demande n'a pas encore l'accord
  ContractPrintedBeforeStatement: { statut: 'ENVOYEE', etape: null, detail: 'Contrat imprimé avant l’accord de financement' },
  // états du portail qui n'apparaissent pas dans les 17 états de l'API : repris par prudence si l'API les renvoie
  InWork: { statut: 'BROUILLON', etape: null, detail: 'Simulation non envoyée à Grenke' },
  OfferToCustomer: { statut: 'BROUILLON', etape: null, detail: 'Offre au client à générer' },
  ChangedAfterStatement: { statut: 'ENVOYEE', etape: null, detail: 'Modifiée après accord : nouvel accord attendu' },
  AwaitingDeliveryConfirmation: { statut: 'EN_SIGNATURE', etape: 'ATTENTE_LIVRAISON', detail: 'En attente de la confirmation de livraison' },
  CancellingESignature: { statut: 'EN_SIGNATURE', etape: null, detail: 'Annulation de la signature en cours' },
}

const cle = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

// Libellés du portail Grenke (anglais et français) -> code d'état de l'API. Source : liste d'états fournie par Grenke (31/10/2026).
const ALIAS: Record<string, string> = {
  inwork: 'InWork', simulationnonenvoyeeagrenke: 'InWork',
  offertocustomer: 'OfferToCustomer', genererloffreauclient: 'OfferToCustomer',
  requesttogrenke: 'RequestToGrenke', demandeenvoyeeagrenke: 'RequestToGrenke',
  contractprintedbeforestatement: 'ContractPrintedBeforeStatement', contratimprimeavantaccorddefinancement: 'ContractPrintedBeforeStatement',
  missingquoteinfo: 'MissingInfo', informationsmanquantespouraccord: 'MissingInfo', missingapplicationinfo: 'MissingInfo', enattentedinformationspourreglement: 'MissingInfo',
  readytosign: 'ReadyToSign', pretasigner: 'ReadyToSign',
  changedafterstatement: 'ChangedAfterStatement', modifieapresaccord: 'ChangedAfterStatement',
  bankguarantee: 'GuaranteeRequired', cautionbancairedemandee: 'GuaranteeRequired',
  contractprinted: 'ContractPrinted', contratimprime: 'ContractPrinted',
  awaitingcustomersignature: 'AwaitingCustomerSignature', enattentedelasignatureduclient: 'AwaitingCustomerSignature',
  awaitingpartnersignature: 'AwaitingPartnerSignature', enattentedelasignaturedupartenaire: 'AwaitingPartnerSignature',
  awaitdeliveryconfirmation: 'AwaitingDeliveryConfirmation', enattentedelaconfirmationdelivraison: 'AwaitingDeliveryConfirmation',
  applicationreceived: 'ApplicationReceived', dossierreglable: 'ApplicationReceived',
  cancelled: 'Cancelled', demandeannulee: 'Cancelled',
  declined: 'Declined', demanderefusee: 'Declined',
}
const INDEX: Record<string, string> = { ...ALIAS, ...Object.fromEntries(Object.keys(TABLE).map(k => [cle(k), k])) }

// null = état à ignorer (« None ») ou inconnu : on ne touche alors pas au statut de la demande.
// Tolérant : « ReadyToSign », « Ready to sign » ou « Prêt à signer » donnent le même résultat.
export const versStatutCommun = (etatGrenke: string): Correspondance | null => {
  const code = INDEX[cle(etatGrenke)]
  return code ? TABLE[code] : null
}

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
