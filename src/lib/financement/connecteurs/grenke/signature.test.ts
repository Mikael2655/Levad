import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErreurMetier } from '../../erreurs'

const appels: { methode: string; chemin: string; corps?: any }[] = []
let reponses: ((a: { methode: string; chemin: string }) => unknown)[] = []
vi.mock('./client', async orig => ({
  ...(await orig<typeof import('./client')>()),
  appelerOk: async (_c: unknown, methode: string, chemin: string, o: { corps?: unknown } = {}) => {
    appels.push({ methode, chemin, corps: o.corps })
    const f = reponses.shift()
    return f ? f({ methode, chemin }) : {}
  },
}))

const ID = '11111111-2222-3333-4444-555555555555'
const config = {} as never
const client = [{ prenom: 'Jeanne', nom: 'Martin', email: 'j@acme.fr', mobile: '0612345678', civilite: 'Ms' as const }]
const levad = [{ prenom: 'Mikael', nom: 'Obadia', email: 'm@levad.fr', civilite: 'Mr' as const }]

describe('lancement de la signature électronique chez Grenke', () => {
  beforeEach(() => { appels.length = 0; reponses = [] })

  it('envoie les signataires (client puis LEVAD) en DocuSign, après lecture de la configuration', async () => {
    const { demarrerSignature } = await import('./api')
    reponses = [() => ({ DocuSign: { MinNumberOfCustomerSignees: 1, MaxNumberOfCustomerSignees: 2, MinNumberOfPartnerSignees: 1, MaxNumberOfPartnerSignees: 1 } }), () => ({})]
    await demarrerSignature(config, ID, { client, fournisseur: levad })
    expect(appels.map(a => `${a.methode} ${a.chemin.replace(ID, '{id}')}`)).toEqual(['GET /basic/v1/requests/{id}/e-signature/configuration', 'POST /basic/v1/requests/{id}/e-signature'])
    expect(appels[1].corps).toEqual({
      CustomerContractSignees: [{ Title: 'Ms', FirstName: 'Jeanne', LastName: 'Martin', Email: 'j@acme.fr', Culture: 'fr-FR', MobileNumber: '0612345678', SigningOrder: 1 }],
      PartnerContractSignees: [{ Title: 'Mr', FirstName: 'Mikael', LastName: 'Obadia', Email: 'm@levad.fr', Culture: 'fr-FR', SigningOrder: 1 }],
      ESignatureType: 'DocuSign',
      UseDeliveryConfirmation: false,
    })
  })

  it('s’arrête si Grenke limite le nombre de signataires, sans lancer la signature', async () => {
    const { demarrerSignature } = await import('./api')
    reponses = [() => ({ DocuSign: { MinNumberOfCustomerSignees: 2, MaxNumberOfCustomerSignees: 3 } })]
    await expect(demarrerSignature(config, ID, { client, fournisseur: levad })).rejects.toThrow(/au moins 2 signataire/)
    expect(appels).toHaveLength(1)
  })

  it('configuration illisible : on tente quand même ; document du contrat manquant : créé une fois puis nouvel essai', async () => {
    const { demarrerSignature } = await import('./api')
    reponses = [
      () => { throw new ErreurMetier('Introuvable chez Grenke (404).', 502) },
      () => { throw new ErreurMetier('Grenke a refusé les données (400) : {"Message":"Contract document missing"}', 502) },
      () => ({}), // création du document
      () => ({}), // nouvel essai
    ]
    await demarrerSignature(config, ID, { client, fournisseur: levad })
    expect(appels.map(a => `${a.methode} ${a.chemin.replace(ID, '{id}')}`)).toEqual([
      'GET /basic/v1/requests/{id}/e-signature/configuration', 'POST /basic/v1/requests/{id}/e-signature', 'POST /basic/v1/requests/{id}/contractdocument', 'POST /basic/v1/requests/{id}/e-signature',
    ])
  })

  it('autre refus de Grenke : l’erreur est remontée telle quelle, sans créer de document', async () => {
    const { demarrerSignature } = await import('./api')
    reponses = [() => ({}), () => { throw new ErreurMetier('Grenke a refusé les données (400) : {"Message":"Invalid mobile number"}', 502) }]
    await expect(demarrerSignature(config, ID, { client, fournisseur: levad })).rejects.toThrow(/Invalid mobile number/)
    expect(appels).toHaveLength(2)
  })
})
