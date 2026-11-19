// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : clôture groupée de contrats arrêtés / terminés chez le financeur.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('clôture groupée des contrats (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let ct: typeof import('./contrats')
  let ids: { admin: number; ass: number; com: number; fin: number }
  const contrat = (o: Record<string, unknown>) => prisma.finContrat.create({ data: { financeurId: ids.fin, commercialId: ids.com, raisonSociale: 'X', materiel: 'x', periodicite: 'TRIMESTRIELLE', dureeMois: 48, loyerCentimes: 30000, ...o } })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    ct = await import('./contrats')
    await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const mk = (email: string, role: string) => prisma.finUtilisateur.create({ data: { email, prenom: 'X', nom: role, role, motDePasseHash: 'x' } })
    const [a, s, c] = [await mk('a@l.fr', 'ADMIN'), await mk('s@l.fr', 'ASSISTANTE'), await mk('c@l.fr', 'COMMERCIAL')]
    const f = await prisma.finFinanceur.create({ data: { nom: 'Grenke' } })
    ids = { admin: a.id, ass: s.id, com: c.id, fin: f.id }
  })
  afterAll(async () => { await prisma?.$disconnect() })
  const ADMIN = () => ({ id: ids.admin, role: 'ADMIN' as const })

  it('clôture la sélection : date de fin si passée, sinon aujourd’hui ; motif enregistré ; déjà clos ignorés', async () => {
    const maintenant = new Date('2026-11-20T10:00:00Z')
    const echu = await contrat({ refFinanceur: '058-1', dateFin: new Date('2025-06-01T00:00:00Z') })
    const impaye = await contrat({ refFinanceur: '058-2', dateFin: new Date('2029-06-01T00:00:00Z') })
    const dejaClos = await contrat({ refFinanceur: '058-3', clotureLe: new Date('2024-01-01'), clotureMotif: 'ancien' })
    const r = await ct.cloturerContrats(ADMIN(), [echu.id, impaye.id, dejaClos.id, echu.id], { motif: 'Résilié (impayés du client)', confirmation: 'CLOTURER' }, maintenant)
    expect(r).toEqual({ clotures: 2, ignores: 1 })
    expect(await prisma.finContrat.findUniqueOrThrow({ where: { id: echu.id } })).toMatchObject({ clotureLe: new Date('2025-06-01T00:00:00Z'), clotureMotif: 'Résilié (impayés du client)' })
    expect((await prisma.finContrat.findUniqueOrThrow({ where: { id: impaye.id } })).clotureLe).toEqual(maintenant)
    expect((await prisma.finContrat.findUniqueOrThrow({ where: { id: dejaClos.id } })).clotureMotif).toBe('ancien') // intact
  })

  it('refus : assistante, commercial, sans confirmation, sans motif, sans sélection', async () => {
    const c = await contrat({ refFinanceur: '058-9', dateFin: new Date('2025-01-01') })
    const base = { motif: 'Terminé', confirmation: 'CLOTURER' }
    await expect(ct.cloturerContrats({ id: ids.ass, role: 'ASSISTANTE' }, [c.id], base)).rejects.toMatchObject({ status: 403 })
    await expect(ct.cloturerContrats({ id: ids.com, role: 'COMMERCIAL' }, [c.id], base)).rejects.toMatchObject({ status: 403 })
    await expect(ct.cloturerContrats(ADMIN(), [c.id], { motif: 'Terminé' })).rejects.toThrow(/non confirmée/)
    await expect(ct.cloturerContrats(ADMIN(), [c.id], { motif: ' ', confirmation: 'CLOTURER' })).rejects.toThrow(/motif/)
    await expect(ct.cloturerContrats(ADMIN(), [], base)).rejects.toThrow(/au moins un contrat/)
    expect((await prisma.finContrat.findUniqueOrThrow({ where: { id: c.id } })).clotureLe).toBeNull()
  })
})
