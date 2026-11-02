import { describe, expect, it } from 'vitest'
import { ETATS_GRENKE_CONNUS, LIBELLES_ETAT_CONTRAT, versStatutCommun } from './statuts'

// Les 17 états d'une demande décrits par l'API Grenke (le 17e, « None », est volontairement ignoré).
const ETATS_API = ['RequestToGrenke', 'MissingInfo', 'ReadyToSign', 'GuaranteeRequired', 'ApplicationReceived', 'Cancelled', 'Declined', 'Contracted', 'None', 'ContractPrinted', 'ContractPrintedBeforeStatement', 'AwaitingCustomerSignature', 'AwaitingPartnerSignature', 'AwaitingDeliveryConfirmation', 'AwaitingSigningAppSignature', 'StartingESignature', 'CancellingESignature']

// États supplémentaires de la liste du portail Grenke (31/10/2026), absents des 17 états du Swagger.
const ETATS_PORTAIL = ['InWork', 'OfferToCustomer', 'ChangedAfterStatement']

describe('états de demande Grenke -> statuts communs', () => {
  it('chaque état de l’API est traité (ou ignoré volontairement)', () => {
    for (const e of ETATS_API) if (e !== 'None') expect(versStatutCommun(e), e).not.toBeNull()
    expect(versStatutCommun('None')).toBeNull()
    expect(ETATS_GRENKE_CONNUS.filter(e => !ETATS_API.includes(e) && !ETATS_PORTAIL.includes(e))).toEqual([]) // aucune correspondance inventée
  })
  it('étapes de signature précisées', () => {
    expect(versStatutCommun('StartingESignature')).toMatchObject({ statut: 'EN_SIGNATURE', etape: 'DEMARRAGE' })
    expect(versStatutCommun('AwaitingCustomerSignature')).toMatchObject({ statut: 'EN_SIGNATURE', etape: 'ATTENTE_CLIENT' })
    expect(versStatutCommun('AwaitingPartnerSignature')).toMatchObject({ statut: 'EN_SIGNATURE', etape: 'ATTENTE_LEVAD' })
    expect(versStatutCommun('ContractPrinted')).toMatchObject({ statut: 'EN_SIGNATURE', etape: 'CONTRAT_EMIS' })
    expect(versStatutCommun('AwaitingDeliveryConfirmation')).toMatchObject({ statut: 'EN_SIGNATURE', etape: 'ATTENTE_LIVRAISON' })
  })
  it('statuts de l’instruction', () => {
    expect(versStatutCommun('RequestToGrenke')?.statut).toBe('ENVOYEE')
    expect(versStatutCommun('MissingInfo')?.statut).toBe('INFOS_MANQUANTES')
    expect(versStatutCommun('GuaranteeRequired')).toMatchObject({ statut: 'INFOS_MANQUANTES', detail: 'Garantie demandée par Grenke' })
    expect(versStatutCommun('ReadyToSign')?.statut).toBe('PRETE_A_SIGNER')
    expect(versStatutCommun('Declined')?.statut).toBe('REFUSEE')
    expect(versStatutCommun('Contracted')?.statut).toBe('SIGNEE')
    expect(versStatutCommun('Cancelled')?.statut).toBe('ANNULEE')
  })
  it('état inconnu : on ne touche pas au statut', () => {
    expect(versStatutCommun('QuelqueChoseDeNouveau')).toBeNull()
  })
  it('états de contrat libellés', () => {
    expect(LIBELLES_ETAT_CONTRAT.RunningContract).toBe('En cours')
  })

  it('liste officielle du portail Grenke : chaque libellé (anglais et français) est reconnu', () => {
    const attendu: [string, string][] = [
      ['In work', 'BROUILLON'], ['Simulation non envoyée à GRENKE', 'BROUILLON'], ['Offer to customer', 'BROUILLON'], ['GÉNÉRER L\'OFFRE AU CLIENT', 'BROUILLON'],
      ['Request to GRENKE', 'ENVOYEE'], ['Demande envoyée à GRENKE', 'ENVOYEE'], ['Contract printed before statement', 'ENVOYEE'], ['Contrat imprimé avant accord de financement', 'ENVOYEE'],
      ['Missing quote info', 'INFOS_MANQUANTES'], ['Informations manquantes pour accord', 'INFOS_MANQUANTES'], ['Missing application info', 'INFOS_MANQUANTES'], ['En attente d\'informations pour règlement.', 'INFOS_MANQUANTES'],
      ['Ready to sign', 'PRETE_A_SIGNER'], ['Prêt à signer', 'PRETE_A_SIGNER'], ['Changed after statement', 'ENVOYEE'], ['Modifié après accord', 'ENVOYEE'],
      ['Bank guarantee', 'INFOS_MANQUANTES'], ['Caution bancaire demandée', 'INFOS_MANQUANTES'],
      ['Contract printed', 'EN_SIGNATURE'], ['Contrat imprimé', 'EN_SIGNATURE'], ['Awaiting customer signature', 'EN_SIGNATURE'], ['En attente de la signature du client', 'EN_SIGNATURE'],
      ['Awaiting partner signature', 'EN_SIGNATURE'], ['En attente de la signature du partenaire', 'EN_SIGNATURE'], ['Await Delivery Confirmation', 'EN_SIGNATURE'], ['En attente de la confirmation de livraison', 'EN_SIGNATURE'],
      ['Application received', 'SIGNEE'], ['Dossier réglable', 'SIGNEE'],
      ['Cancelled', 'ANNULEE'], ['Demande annulée', 'ANNULEE'], ['Declined', 'REFUSEE'], ['Demande refusée', 'REFUSEE'],
    ]
    for (const [libelle, statut] of attendu) expect(versStatutCommun(libelle)?.statut, libelle).toBe(statut)
  })
  it('les familles du portail : Accord = ReadyToSign, Mise en place = signature puis dossier réglable', () => {
    expect(versStatutCommun('AwaitingPartnerSignature')?.etape).toBe('ATTENTE_LEVAD')
    expect(versStatutCommun('ApplicationReceived')?.detail).toBe('Dossier réglable')
    expect(versStatutCommun('ContractPrintedBeforeStatement')?.statut).toBe('ENVOYEE') // pas encore l'accord : ne passe pas en « En signature »
  })
})

import { libelleTypeBien, TYPES_BIENS_GRENKE, TYPE_BIEN_PAR_DEFAUT } from './types-biens'
describe('types de biens Grenke', () => {
  it('identifiants communiqués par Grenke', () => {
    expect(TYPES_BIENS_GRENKE.map(t => [t.id, t.actif])).toEqual([[7, true], [136, false], [1, false], [134, false]])
    expect(TYPE_BIEN_PAR_DEFAUT).toBe(7)
    expect(libelleTypeBien(136)).toContain('Téléphonie IP')
    expect(libelleTypeBien(99)).toBe('Type n° 99')
  })
})
