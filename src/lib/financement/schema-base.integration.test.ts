// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('contrôle du schéma de la base (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let verifier: typeof import('./schema-base').verifierSchemaBase

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    verifier = (await import('./schema-base')).verifierSchemaBase
  })
  afterAll(async () => { await prisma?.$disconnect() })

  it('base à jour : rien ne manque', async () => {
    expect(await verifier()).toEqual({ ok: true, manquantes: [], scripts: [] })
  })
  it('colonne ajoutée par une mise à jour absente : détectée, avec le script à exécuter', async () => {
    await prisma.$executeRawUnsafe('ALTER TABLE "fin_demande" DROP COLUMN "etapeSignature"')
    try {
      expect(await verifier()).toEqual({ ok: false, manquantes: ['fin_demande.etapeSignature'], scripts: ['prisma/migrations/manual_financement_2.sql'] })
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "fin_demande" ADD COLUMN "etapeSignature" TEXT')
    }
  })
  it('table absente : détectée, avec le script complet', async () => {
    await prisma.$executeRawUnsafe('ALTER TABLE "fin_signature" RENAME TO "fin_signature_masquee"')
    try {
      const r = await verifier()
      expect(r.manquantes).toEqual(['fin_signature'])
      expect(r.scripts).toEqual(['prisma/migrations/manual_financement.sql'])
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "fin_signature_masquee" RENAME TO "fin_signature"')
    }
  })
})
