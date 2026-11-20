// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : accord reçu d'un financeur sans API, puis nouvel accord négocié.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip
vi.mock('./notifications', async orig => ({ ...(await orig<typeof import('./notifications')>()), notifierChangement: async () => {} }))

d('accords reçus par e-mail (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let ac: typeof import('./accords')
  let acces: typeof import('./acces')
  let ids: { admin: number; com: number; fin: number; grenke: number }
  const creer = (o: Record<string, unknown> = {}) => prisma.finDemande.create({ data: { reference: `LEV-A-${Math.random().toString(36).slice(2, 8)}`, financeurId: ids.fin, commercialId: ids.com, saisiParId: ids.admin, statut: 'ENVOYEE', raisonSociale: 'ACME', siret: '35600000000048', adresse: 'x', dureeMois: 48, periodicite: 'TRIMESTRIELLE', loyerCentimes: 36000, montantCommercialCentimes: 473684, coefficientCommercialPpm: 76000, contactPrenom: '', contactNom: '', contactEmail: '', ...o } })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    ac = await import('./accords'); acces = await import('./acces')
    await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const mk = (email: string, role: string) => prisma.finUtilisateur.create({ data: { email, prenom: 'X', nom: role, role, motDePasseHash: 'x' } })
    const [a, c] = [await mk('a@l.fr', 'ADMIN'), await mk('c@l.fr', 'COMMERCIAL')]
    const f = await prisma.finFinanceur.create({ data: { nom: 'Solubail', connecteur: 'manuel' } })
    const g = await prisma.finFinanceur.create({ data: { nom: 'Grenke', connecteur: 'grenke_api' } })
    ids = { admin: a.id, com: c.id, fin: f.id, grenke: g.id }
  })
  afterAll(async () => { await prisma?.$disconnect() })
  const ADMIN = () => ({ id: ids.admin, role: 'ADMIN' as const })

  it('premier accord : montant réel enregistré, demande « Prête à signer », historique sans montant', async () => {
    const dem = await creer()
    expect(await ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 480000, note: 'coef 2,95 %' })).toEqual({ ok: true, premier: true })
    const apres = await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })
    expect(apres).toMatchObject({ statut: 'PRETE_A_SIGNER', montantReelCentimes: 480000, coefficientReelPpm: 75000 })
    const h = await prisma.finHistorique.findFirstOrThrow({ where: { demandeId: dem.id, nouveauStatut: 'PRETE_A_SIGNER' } })
    expect(h.commentaire).toBe('Accord reçu de Solubail')
    expect(h.commentaire).not.toMatch(/\d{4}/) // jamais de montant dans ce que voient les commerciaux
  })

  it('nouvel accord négocié : remplace le montant, garde l’ancien, le montant commercial ne change pas', async () => {
    const dem = await creer()
    await ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 480000 })
    expect(await ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 490000, note: 'meilleur coefficient' })).toEqual({ ok: true, premier: false })
    const apres = await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })
    expect(apres).toMatchObject({ statut: 'PRETE_A_SIGNER', montantReelCentimes: 490000, montantCommercialCentimes: 473684 })
    const l = await ac.listerAccords(ADMIN(), dem.id)
    expect(l.map(x => x.montantReelCentimes)).toEqual([490000, 480000]) // plus récent d'abord
    expect(await ac.listerAccords({ id: ids.com, role: 'COMMERCIAL' }, dem.id)).toEqual([]) // invisible des commerciaux
    expect(await prisma.finHistorique.count({ where: { demandeId: dem.id, commentaire: 'Accord mis à jour (Solubail)' } })).toBe(1)
  })

  it('le commercial ne voit ni le montant réel ni les accords sur sa demande', async () => {
    const dem = await creer()
    await ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 480000 })
    const vue = (await acces.lireDemande({ id: ids.com, role: 'COMMERCIAL' }, dem.id)) as Record<string, unknown>
    expect(JSON.stringify(vue)).not.toContain('480000')
    expect('montantReelCentimes' in vue).toBe(false)
    expect(vue.statut).toBe('PRETE_A_SIGNER')
  })

  it('refus : commercial, financeur à interface automatique, statut en signature, montant absurde', async () => {
    const dem = await creer()
    await expect(ac.enregistrerAccord({ id: ids.com, role: 'COMMERCIAL' }, dem.id, { montantReelCentimes: 480000 })).rejects.toMatchObject({ status: 403 })
    const g = await creer({ financeurId: ids.grenke })
    await expect(ac.enregistrerAccord(ADMIN(), g.id, { montantReelCentimes: 480000 })).rejects.toThrow(/interface/)
    const sig = await creer({ statut: 'EN_SIGNATURE' })
    await expect(ac.enregistrerAccord(ADMIN(), sig.id, { montantReelCentimes: 480000 })).rejects.toMatchObject({ status: 409 })
    await expect(ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 48000000 })).rejects.toThrow(/éloigné/)
    await expect(ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 0 })).rejects.toThrow(/invalide/)
  })

  it('numéro d’accord : il devient le numéro de la demande ; un nouvel accord le remplace ; un numéro déjà pris est refusé', async () => {
    const dem = await creer()
    await ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 480000, numeroAccord: ' 75815IB ' })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).refFinanceur).toBe('75815IB')
    await ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 490000, numeroAccord: '75815IC' })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).refFinanceur).toBe('75815IC')
    await ac.enregistrerAccord(ADMIN(), dem.id, { montantReelCentimes: 495000 }) // sans numéro : l'actuel est conservé
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).refFinanceur).toBe('75815IC')
    const autre = await creer()
    await expect(ac.enregistrerAccord(ADMIN(), autre.id, { montantReelCentimes: 480000, numeroAccord: '75815IC' })).rejects.toMatchObject({ status: 409 })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: autre.id } })).statut).toBe('ENVOYEE')
  })
})
