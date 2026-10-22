// Test sur une vraie base PostgreSQL. Lancé seulement si FIN_TEST_DATABASE_URL est défini (base jetable : elle est vidée !).
//   FIN_TEST_DATABASE_URL=postgresql://... npx prisma db push && FIN_TEST_DATABASE_URL=... DATABASE_URL=... npx vitest run
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('accès aux demandes selon le rôle (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let acces: typeof import('./acces')
  let ids: { admin: number; assistante: number; comA: number; comB: number; dA: number; dB: number }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    acces = await import('./acces')
    await prisma.finDemande.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
    const mk = (email: string, role: string) => prisma.finUtilisateur.create({ data: { email, prenom: 'P', nom: 'N', role, motDePasseHash: 'x' } })
    const [admin, assistante, comA, comB] = await Promise.all([mk('a@t.fr', 'ADMIN'), mk('s@t.fr', 'ASSISTANTE'), mk('ca@t.fr', 'COMMERCIAL'), mk('cb@t.fr', 'COMMERCIAL')])
    const fin = await prisma.finFinanceur.create({ data: { nom: 'Grenke' } })
    const demande = (commercialId: number, reference: string) =>
      prisma.finDemande.create({
        data: {
          reference, financeurId: fin.id, commercialId, saisiParId: commercialId,
          raisonSociale: 'ACME', siret: '12345678900011', adresse: '1 rue X',
          contactPrenom: 'A', contactNom: 'B', contactEmail: 'a@b.fr',
          dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300,
          montantCommercialCentimes: 1215126, coefficientCommercialPpm: 59500,
          montantReelCentimes: 1255208, coefficientReelPpm: 57600,
        },
      })
    const [dA, dB] = [await demande(comA.id, 'LEV-T-1'), await demande(comB.id, 'LEV-T-2')]
    ids = { admin: admin.id, assistante: assistante.id, comA: comA.id, comB: comB.id, dA: dA.id, dB: dB.id }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  it('un commercial ne liste que ses demandes, même en demandant celles d’un autre', async () => {
    const liste = await acces.listerDemandes({ id: ids.comA, role: 'COMMERCIAL' }, { commercialId: ids.comB })
    expect(liste.map(x => x.id)).toEqual([ids.dA])
  })
  it('un commercial ne peut pas ouvrir la demande d’un collègue (comme si elle n’existait pas)', async () => {
    expect(await acces.lireDemande({ id: ids.comA, role: 'COMMERCIAL' }, ids.dB)).toBeNull()
    expect(await acces.lireDemande({ id: ids.comA, role: 'COMMERCIAL' }, ids.dA)).not.toBeNull()
  })
  it('ce que le serveur renvoie à un commercial ne contient aucune donnée réelle', async () => {
    const c = { id: ids.comA, role: 'COMMERCIAL' as const }
    const json = JSON.stringify([await acces.listerDemandes(c), await acces.lireDemande(c, ids.dA)])
    for (const interdit of ['Reel', 'marge', '1255208', '57600']) expect(json).not.toContain(interdit)
    expect(json).toContain('1215126')
  })
  it('l’assistante et l’admin voient tout, avec le réel', async () => {
    for (const role of ['ASSISTANTE', 'ADMIN'] as const) {
      const liste = await acces.listerDemandes({ id: role === 'ADMIN' ? ids.admin : ids.assistante, role })
      expect(liste).toHaveLength(2)
      expect(JSON.stringify(liste)).toContain('1255208')
    }
  })
  it('une demande archivée sort de la liste et revient avec le filtre « archivées »', async () => {
    await prisma.finDemande.update({ where: { id: ids.dA }, data: { archivee: true } })
    const c = { id: ids.comA, role: 'COMMERCIAL' as const }
    expect(await acces.listerDemandes(c)).toHaveLength(0)
    expect(await acces.listerDemandes(c, { archivees: true })).toHaveLength(1)
  })
})
