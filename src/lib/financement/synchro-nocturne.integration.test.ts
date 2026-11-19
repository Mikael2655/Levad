// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : synchronisation de nuit des contrats Grenke, Grenke simulé.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ContratFinanceur } from './connecteurs/connecteur'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

let compte: ContratFinanceur[] = []
let distributeur: ContratFinanceur[] | Error = []
let config = true
vi.mock('./connecteurs/grenke/config', async orig => ({ ...(await orig<typeof import('./connecteurs/grenke/config')>()), lireConfigGrenke: () => (config ? { prete: true, manquantes: [], problemes: [], config: {} } : { prete: false, manquantes: ['X'], problemes: [] }) }))
vi.mock('./connecteurs/grenke/connecteur', async orig => ({
  ...(await orig<typeof import('./connecteurs/grenke/connecteur')>()),
  creerConnecteurGrenke: () => ({ listerContrats: async () => compte, listerContratsDistributeur: async () => { if (distributeur instanceof Error) throw distributeur; return distributeur } }),
}))

const distant = (o: Partial<ContratFinanceur> = {}): ContratFinanceur => ({ reference: '100-62500', etatBrut: 'RunningContract', client: 'ACME', loyerMensuelCentimes: 10000, dureeMois: 48, montantFinanceCentimes: 1000000, dateDebut: new Date('2026-01-01T00:00:00Z'), dateFin: new Date('2030-01-01T00:00:00Z'), ...o })

d('synchronisation de nuit (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let sn: typeof import('./synchro-nocturne')
  let notif: typeof import('./notifications')
  const mails: { to: string; sujet: string }[] = []

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    sn = await import('./synchro-nocturne'); notif = await import('./notifications')
    notif.remplacerExpediteur(async m => { mails.push({ to: m.to, sujet: m.sujet }) })
    await prisma.finNotification.deleteMany(); await prisma.finParametre.deleteMany(); await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const a = await prisma.finUtilisateur.create({ data: { email: 'admin@l.fr', prenom: 'A', nom: 'A', role: 'ADMIN', motDePasseHash: 'x' } })
    const f = await prisma.finFinanceur.create({ data: { nom: 'Grenke', connecteur: 'grenke_api' } })
    await prisma.finContrat.create({ data: { financeurId: f.id, commercialId: a.id, raisonSociale: 'ACME', refFinanceur: '100-62500', materiel: 'x', periodicite: 'TRIMESTRIELLE', dureeMois: 48, loyerCentimes: 30000, dateDebut: null, dateFin: null } })
    await prisma.finContrat.create({ data: { financeurId: f.id, commercialId: a.id, raisonSociale: 'VIEUX', refFinanceur: '058-1', materiel: 'x', periodicite: 'TRIMESTRIELLE', dureeMois: 48, loyerCentimes: 30000, dateFin: new Date('2020-01-01') } })
  })
  afterAll(async () => { notif.remplacerExpediteur(null); await prisma?.$disconnect() })

  it('complète les champs vides, ne crée aucun contrat inconnu, le signale par e-mail', async () => {
    compte = [distant(), distant({ reference: '100-99999', client: 'NOUVEAU' })]
    const r = await sn.synchroNocturne()
    expect(r.ok).toBe(true)
    expect(r.nouveaux).toEqual(['100-99999 · NOUVEAU'])
    expect(await prisma.finContrat.count()).toBe(2) // rien de créé
    const c = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: '100-62500' } })
    expect(c.dateDebut?.toISOString()).toBe('2026-01-01T00:00:00.000Z') // champ vide complété
    expect(r.absents).toBe(1) // « VIEUX » : signalé dans le compte rendu, jamais clôturé
    expect((await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: '058-1' } })).clotureLe).toBeNull()
    expect(mails.map(m => m.sujet)).toEqual(['Contrats Grenke : points à vérifier'])
    expect(JSON.parse((await notif.lireParametre(sn.PARAM_SYNCHRO_DERNIERE))!).ok).toBe(true)
  })

  it('même constat le lendemain : pas de nouveau mail ; un nouveau point : mail', async () => {
    await sn.synchroNocturne()
    expect(mails).toHaveLength(1)
    compte = [distant(), distant({ reference: '100-99999', client: 'NOUVEAU' }), distant({ reference: '100-88888', client: 'ENCORE' })]
    await sn.synchroNocturne()
    expect(mails).toHaveLength(2)
  })

  it('mode Distributeur en panne : la comparaison du compte continue, avec avertissement', async () => {
    distributeur = new Error('403')
    const r = await sn.synchroNocturne()
    expect(r.ok).toBe(true)
    expect(r.avertissements?.join(' ')).toContain('Distributeur non lus')
  })

  it('échec (configuration, Grenke) : consigné et signalé aux administrateurs', async () => {
    config = false
    const avant = mails.length
    const r = await sn.synchroNocturne()
    expect(r.ok).toBe(false)
    expect(r.erreur).toMatch(/Configuration/)
    expect(mails.length).toBe(avant + 1)
    expect(mails.at(-1)?.sujet).toContain('échec')
    config = true
  })
})
