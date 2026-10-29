// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : base jetable, vidée par le test.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('installation (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let inst: typeof import('./installation')
  const CODE = 'un-code-secret-de-plus-de-20-caracteres'
  const infos = { email: 'Moi@Levad.fr', prenom: 'Mikael', nom: 'B' }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    inst = await import('./installation')
    await prisma.finContrat.deleteMany()
    await prisma.finDemande.deleteMany()
    await prisma.finGrille.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
  })
  afterAll(async () => { delete process.env.FIN_INSTALL_CODE; await prisma?.$disconnect() })

  it('désactivée sans code, ou avec un code trop court', async () => {
    delete process.env.FIN_INSTALL_CODE
    expect(await inst.etatInstallation()).toBe('DESACTIVEE')
    await expect(inst.installer({ code: 'x', ...infos })).rejects.toThrow('indisponible')
    process.env.FIN_INSTALL_CODE = 'court'
    expect(await inst.etatInstallation()).toBe('DESACTIVEE')
    await expect(inst.installer({ code: 'court', ...infos })).rejects.toThrow('indisponible')
  })
  it('mauvais code refusé, rien n’est créé', async () => {
    process.env.FIN_INSTALL_CODE = CODE
    expect(await inst.etatInstallation()).toBe('POSSIBLE')
    await expect(inst.installer({ code: 'mauvais', ...infos })).rejects.toThrow('incorrect')
    expect(await prisma.finUtilisateur.count()).toBe(0)
  })
  it('bon code : administrateur + Grenke + les deux barèmes', async () => {
    const r = await inst.installer({ code: CODE, ...infos })
    expect(r.email).toBe('moi@levad.fr')
    expect(r.motDePasseProvisoire.length).toBeGreaterThanOrEqual(12)
    expect(await prisma.finUtilisateur.findMany({ select: { role: true, doitChangerMotDePasse: true } })).toEqual([{ role: 'ADMIN', doitChangerMotDePasse: true }])
    expect(await prisma.finFinanceur.count({ where: { nom: 'Grenke' } })).toBe(1)
    expect(await prisma.finGrille.count()).toBe(2)
  })
  it('tables absentes : état « base non prête » au lieu d’une erreur, et installation refusée', async () => {
    await prisma.$executeRawUnsafe('ALTER TABLE "fin_utilisateur" RENAME TO "fin_utilisateur_masquee"')
    try {
      expect(await inst.etatInstallation()).toBe('BASE_NON_PRETE')
      await expect(inst.installer({ code: CODE, ...infos })).rejects.toThrow('pas prête')
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "fin_utilisateur_masquee" RENAME TO "fin_utilisateur"')
    }
  })
  it('se verrouille ensuite, même avec le bon code', async () => {
    expect(await inst.etatInstallation()).toBe('DEJA_INSTALLEE')
    await expect(inst.installer({ code: CODE, ...infos, email: 'autre@levad.fr' })).rejects.toThrow('déjà installé')
    expect(await prisma.finUtilisateur.count()).toBe(1)
  })
})
