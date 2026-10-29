import { describe, expect, it } from 'vitest'
import { ETATS_GRENKE_CONNUS, LIBELLES_ETAT_CONTRAT, versStatutCommun } from './statuts'

// Les 17 états d'une demande décrits par l'API Grenke (le 17e, « None », est volontairement ignoré).
const ETATS_API = ['RequestToGrenke', 'MissingInfo', 'ReadyToSign', 'GuaranteeRequired', 'ApplicationReceived', 'Cancelled', 'Declined', 'Contracted', 'None', 'ContractPrinted', 'ContractPrintedBeforeStatement', 'AwaitingCustomerSignature', 'AwaitingPartnerSignature', 'AwaitingDeliveryConfirmation', 'AwaitingSigningAppSignature', 'StartingESignature', 'CancellingESignature']

describe('états de demande Grenke -> statuts communs', () => {
  it('chaque état de l’API est traité (ou ignoré volontairement)', () => {
    for (const e of ETATS_API) if (e !== 'None') expect(versStatutCommun(e), e).not.toBeNull()
    expect(versStatutCommun('None')).toBeNull()
    expect(ETATS_GRENKE_CONNUS.filter(e => !ETATS_API.includes(e))).toEqual([]) // aucune correspondance inventée
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
})
