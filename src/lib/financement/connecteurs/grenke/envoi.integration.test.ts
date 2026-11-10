// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : envoi automatique à la création, avec Grenke simulé.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

let refus = false
const appels: Record<string, unknown>[] = []
vi.mock('./config', async orig => ({ ...(await orig<typeof import('./config')>()), lireConfigGrenke: () => ({ prete: true, manquantes: [], problemes: [], config: { modePaiement: 'DirectDebit', urlBase: 'x', cert: '', key: '' } }) }))
vi.mock('./api', async orig => ({
  ...(await orig<typeof import('./api')>()),
  creerDemandeApi: async (_c: unknown, requete: Record<string, unknown>) => {
    if (refus) throw new (await import('../../erreurs')).ErreurMetier('Grenke a refusé les données (400) : test', 502)
    appels.push(requete)
    return '11111111-2222-3333-4444-555555555555'
  },
  lireDemande: async () => ({ RequestId: '100-777' }),
}))

d('envoi automatique à la création (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let envoi: typeof import('./envoi')
  let ids: { admin: number; ass: number; com: number; fin: number; manuel: number }

  const creer = (o: Record<string, unknown> = {}) =>
    prisma.finDemande.create({
      data: {
        reference: `LEV-A-${Math.random().toString(36).slice(2, 8)}`, financeurId: ids.fin, commercialId: ids.com, saisiParId: ids.admin, statut: 'BROUILLON',
        raisonSociale: 'TEST SCM', siret: '92155693200017', adresse: '1 rue A', codePostal: '75001', ville: 'PARIS', contactPrenom: '', contactNom: '', contactEmail: '',
        dureeMois: 48, periodicite: 'TRIMESTRIELLE', loyerCentimes: 36000, montantCommercialCentimes: 473684, coefficientCommercialPpm: 76000, montantReelCentimes: 478088,
        lignes: { create: [{ designation: 'iRA c3720i', quantite: 1, typeBien: '7' }] }, ...o,
      },
    })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    envoi = await import('./envoi')
    await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const mk = (email: string, role: string) => prisma.finUtilisateur.create({ data: { email, prenom: 'X', nom: 'Y', role, motDePasseHash: 'x' } })
    const [a, s, c] = [await mk('a@l.fr', 'ADMIN'), await mk('s@l.fr', 'ASSISTANTE'), await mk('c@l.fr', 'COMMERCIAL')]
    const f = await prisma.finFinanceur.create({ data: { nom: 'Grenke', connecteur: 'grenke_api' } })
    const m = await prisma.finFinanceur.create({ data: { nom: 'Solubail', connecteur: 'manuel' } })
    ids = { admin: a.id, ass: s.id, com: c.id, fin: f.id, manuel: m.id }
  })
  afterAll(async () => { delete process.env.GRENKE_ECRITURE; delete process.env.GRENKE_SIREN_TEST; await prisma?.$disconnect() })

  const ADMIN = () => ({ id: ids.admin, role: 'ADMIN' as const })

  it('fermé : rien ne part, la demande reste en brouillon', async () => {
    delete process.env.GRENKE_ECRITURE
    const dem = await creer()
    expect(await envoi.tenterEnvoiAutomatique(ADMIN(), dem.id)).toEqual({ envoi: 'non' })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).statut).toBe('BROUILLON')
  })

  it('essai sur le bon SIREN : la demande part, passe à Envoyée avec son numéro lisible', async () => {
    process.env.GRENKE_ECRITURE = 'test'; process.env.GRENKE_SIREN_TEST = '921556932'
    const dem = await creer()
    expect(await envoi.tenterEnvoiAutomatique(ADMIN(), dem.id)).toEqual({ envoi: 'ok' })
    const apres = await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })
    expect(apres).toMatchObject({ statut: 'ENVOYEE', idFinanceur: '11111111-2222-3333-4444-555555555555', refFinanceur: '100-777' })
    expect(appels.at(-1)).toMatchObject({ FinancingAmount: 4780.88, Period: 48 })
    // pas de second envoi
    expect((await envoi.tenterEnvoiAutomatique(ADMIN(), dem.id)).envoi).toBe('erreur')
    expect(appels).toHaveLength(1)
  })

  it('essai sur un autre SIREN : refusé, la demande reste enregistrée en brouillon', async () => {
    process.env.GRENKE_ECRITURE = 'test'; process.env.GRENKE_SIREN_TEST = '444517296'
    const dem = await creer()
    const r = await envoi.tenterEnvoiAutomatique(ADMIN(), dem.id)
    expect(r.envoi).toBe('erreur')
    expect(r.message).toMatch(/SIREN de test/)
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).statut).toBe('BROUILLON')
  })

  it('refus clair de Grenke : brouillon conservé, aucun verrou laissé', async () => {
    process.env.GRENKE_ECRITURE = 'oui'
    refus = true
    const dem = await creer()
    const r = await envoi.tenterEnvoiAutomatique(ADMIN(), dem.id)
    refus = false
    expect(r.envoi).toBe('erreur')
    expect(await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).toMatchObject({ statut: 'BROUILLON', idFinanceur: null })
  })

  it('assistante, commercial et financeur sans API : jamais d’envoi automatique', async () => {
    process.env.GRENKE_ECRITURE = 'oui'
    const n = appels.length
    const dem = await creer()
    expect(await envoi.tenterEnvoiAutomatique({ id: ids.ass, role: 'ASSISTANTE' }, dem.id)).toEqual({ envoi: 'non' })
    expect(await envoi.tenterEnvoiAutomatique({ id: ids.com, role: 'COMMERCIAL' }, dem.id)).toEqual({ envoi: 'non' })
    const manuel = await creer({ financeurId: ids.manuel })
    expect(await envoi.tenterEnvoiAutomatique(ADMIN(), manuel.id)).toEqual({ envoi: 'non' })
    expect(appels).toHaveLength(n)
  })
})
