import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErreurMetier } from '../../erreurs'

const appels: { chemin: string; query?: Record<string, unknown> }[] = []
let reponses: (() => unknown)[] = []
vi.mock('./client', async orig => ({
  ...(await orig<typeof import('./client')>()),
  appelerOk: async (_c: unknown, _m: string, chemin: string, o: { query?: Record<string, unknown> } = {}) => {
    appels.push({ chemin, query: o.query })
    const f = reponses.shift()
    return f ? f() : { Items: [] }
  },
}))

const VIDE = () => { throw new ErreurMetier('Grenke a refusé les données (400) : {"Errors":{"InTheNameOfBusinessPartner":["\'In The Name Of Business Partner\' must not be empty."]}}', 502) }
const config = {} as never

describe('contrats en mode Distributeur', () => {
  beforeEach(() => { appels.length = 0; reponses = [] })

  it('essaie les écritures du paramètre « partenaire » tant que Grenke dit qu’il est vide, et garde celle qui passe', async () => {
    const { listerContratsDistributeur } = await import('./api')
    reponses = [VIDE, VIDE, () => ({ Items: [{ ContractId: '058-61458' }], Total: 1, PageCount: 1 })]
    const r = await listerContratsDistributeur(config, '058-42706')
    expect(r.items).toHaveLength(1)
    expect(r.parametreUtilise).toBe('inTheNameOfBusinessPartnerInput.InTheNameOfBusinessPartner')
    expect(appels).toHaveLength(3)
    expect(appels.every(a => a.chemin === '/distributor/v1/contracts' && Object.values(a.query ?? {}).includes('058-42706'))).toBe(true)
  })

  it('toute autre réponse de Grenke est définitive : pas d’essais en cascade', async () => {
    const { listerContratsDistributeur } = await import('./api')
    reponses = [() => { throw new ErreurMetier('Accès refusé par Grenke (403)', 502) }]
    await expect(listerContratsDistributeur(config, '058-42706')).rejects.toThrow(/403/)
    expect(appels).toHaveLength(1)
  })

  it('partenaires : 058-42706 par défaut, ou la variable GRENKE_DISTRIBUTEUR_PARTENAIRES', async () => {
    const { partenairesDistributeur } = await import('./api')
    expect(partenairesDistributeur({})).toEqual(['058-42706'])
    expect(partenairesDistributeur({ GRENKE_DISTRIBUTEUR_PARTENAIRES: '058-42706, 059-111;060-222' })).toEqual(['058-42706', '059-111', '060-222'])
  })
})
