// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : demandes et contrats déjà en cours pour un même client.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('doublons client (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let dbl: typeof import('./doublons')
  let ids: { admin: number; comA: number; comB: number; fin: number }

  const demande = (o: Record<string, unknown>) =>
    prisma.finDemande.create({
      data: {
        reference: `LEV-D-${Math.random().toString(36).slice(2, 8)}`, financeurId: ids.fin, commercialId: ids.comA, saisiParId: ids.admin, statut: 'ENVOYEE',
        raisonSociale: 'CKE AVOCATS', siret: '92155693200017', adresse: 'x', dureeMois: 48, periodicite: 'TRIMESTRIELLE', loyerCentimes: 36000, montantCommercialCentimes: 473684, coefficientCommercialPpm: 76000, contactPrenom: '', contactNom: '', contactEmail: '', ...o,
      },
    })
  const contrat = (o: Record<string, unknown>) =>
    prisma.finContrat.create({ data: { financeurId: ids.fin, commercialId: ids.comA, raisonSociale: 'CKE AVOCATS', siret: '92155693200017', materiel: 'x', periodicite: 'TRIMESTRIELLE', dureeMois: 63, loyerCentimes: 70000, refFinanceur: '058-61574', dateFin: new Date(Date.now() + 365 * 86400000), ...o } })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    dbl = await import('./doublons')
    await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const mk = (email: string, role: string) => prisma.finUtilisateur.create({ data: { email, prenom: 'X', nom: role, role, motDePasseHash: 'x' } })
    const [a, c1, c2] = [await mk('a@l.fr', 'ADMIN'), await mk('c1@l.fr', 'COMMERCIAL'), await mk('c2@l.fr', 'COMMERCIAL')]
    const f = await prisma.finFinanceur.create({ data: { nom: 'Grenke' } })
    ids = { admin: a.id, comA: c1.id, comB: c2.id, fin: f.id }
    await demande({}) // en cours, commercial A
    await demande({ statut: 'ANNULEE' }) // ignorée
    await demande({ statut: 'REFUSEE' }) // ignorée
    await demande({ raisonSociale: 'AUTRE', siret: '35600000000048' }) // autre client
    await contrat({}) // en cours
    await contrat({ refFinanceur: 'X-CLOS', clotureLe: new Date() }) // clôturé : ignoré
    await contrat({ refFinanceur: 'X-ECHU', dateFin: new Date('2020-01-01'), denonceLe: new Date('2019-12-01') }) // échu et dénoncé : ignoré
    await contrat({ refFinanceur: 'X-TACITE', dateFin: new Date('2025-01-01') }) // tacite reconduction : compté
    await contrat({ refFinanceur: 'NOM-SEUL', siret: null }) // sans SIRET mais même raison sociale
  })
  afterAll(async () => { await prisma?.$disconnect() })

  it('administrateur : voit demandes en cours et contrats en cours (tacite compris), pas les clôturés', async () => {
    const r = await dbl.rechercherDoublons({ id: ids.admin, role: 'ADMIN' }, { siret: '921556932', raisonSociale: 'cke avocats' })
    expect(r.demandes).toHaveLength(1)
    expect(r.contrats.map(c => c.reference).sort()).toEqual(['058-61574', 'NOM-SEUL', 'X-TACITE'])
    expect(r.contrats.find(c => c.reference === 'X-TACITE')?.etat).toBe('TACITE')
    expect(r.autres).toBe(0)
  })

  it('commercial : ne voit que les siens, les dossiers des autres sont seulement comptés', async () => {
    const r = await dbl.rechercherDoublons({ id: ids.comB, role: 'COMMERCIAL' }, { siret: '92155693200017', raisonSociale: 'CKE AVOCATS' })
    expect(r.demandes).toEqual([])
    expect(r.contrats).toEqual([])
    expect(r.autres).toBe(4) // 1 demande + 3 contrats
    const moi = await dbl.rechercherDoublons({ id: ids.comA, role: 'COMMERCIAL' }, { siret: '92155693200017', raisonSociale: 'CKE AVOCATS' })
    expect(moi.demandes).toHaveLength(1)
    expect(moi.autres).toBe(0)
  })

  it('exclut la demande en cours de modification ; rien sans SIREN ni nom exploitable', async () => {
    const une = await prisma.finDemande.findFirstOrThrow({ where: { statut: 'ENVOYEE', raisonSociale: 'CKE AVOCATS' } })
    const r = await dbl.rechercherDoublons({ id: ids.admin, role: 'ADMIN' }, { siret: '', raisonSociale: 'CKE AVOCATS', exclureDemandeId: une.id })
    expect(r.demandes).toHaveLength(0)
    expect(await dbl.rechercherDoublons({ id: ids.admin, role: 'ADMIN' }, { siret: '', raisonSociale: 'ab' })).toEqual({ demandes: [], contrats: [], autres: 0 })
  })
})
