// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : synchronisation des contrats, règles de protection des données saisies.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES } from './baremes'
import type { ContratFinanceur } from './connecteurs/connecteur'
import { lignesVersMatrice } from './grilles'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('synchronisation des contrats (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let sy: typeof import('./synchro-contrats')
  let ids: { admin: number; assistante: number; comA: number; comB: number; grenke: number }
  const A = () => ({ id: ids.admin, role: 'ADMIN' as const })
  const jour = (s: string) => new Date(`${s}T00:00:00Z`)
  const distant = (o: Partial<ContratFinanceur> = {}): ContratFinanceur => ({ reference: 'A1L-65243', etatBrut: 'RunningContract', client: 'SAHAM EUROPE SAS', loyerMensuelCentimes: 72300, dureeMois: 63, montantFinanceCentimes: 1255208, dateDebut: jour('2026-01-01'), dateFin: jour('2031-04-01'), ...o })
  const param = (o: Record<string, unknown> = {}) => ({ financeurId: ids.grenke, commercialDefautId: ids.comB, periodicite: 'TRIMESTRIELLE' as const, appliquer: true, ...o })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    sy = await import('./synchro-contrats')
    await prisma.finRachat.deleteMany()
    await prisma.finContrat.deleteMany()
    await prisma.finDemande.deleteMany()
    await prisma.finGrille.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
    const mk = async (email: string, role: string) => (await admin.creerUtilisateur({ email, prenom: 'P', nom: email.split('@')[0], role })).utilisateur.id
    const [a, s, ca, cb] = [await mk('boss@t.fr', 'ADMIN'), await mk('assist@t.fr', 'ASSISTANTE'), await mk('ca@t.fr', 'COMMERCIAL'), await mk('cb@t.fr', 'COMMERCIAL')]
    const grenke = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    await admin.enregistrerGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES))
    ids = { admin: a, assistante: s, comA: ca, comB: cb, grenke }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  // Un contrat déjà importé, avec des données saisies à la main
  let existant: number
  it('mise en place : contrat importé, personnalisé (commercial, matériel, banque, dénonciation)', async () => {
    existant = (await prisma.finContrat.create({ data: { importe: true, refFinanceur: 'A1L 65243', financeurId: ids.grenke, commercialId: ids.comA, raisonSociale: 'SAHAM EUROPE SAS', materiel: '2 × Canon C3226i corrigé à la main', banque: 'Locam', periodicite: 'TRIMESTRIELLE', dureeMois: 63, loyerCentimes: 72300, dateDebut: null, dateFin: jour('2031-07-01'), montantCommercialCentimes: 1215126, montantReelCentimes: null, denonceLe: jour('2026-09-01'), statutFinanceur: 'Defective' } })).id
    expect(existant).toBeGreaterThan(0)
  })
  it('droits : l’administrateur seul ; réponse vide : rien n’est modifié', async () => {
    await expect(sy.synchroniserContrats({ id: ids.assistante, role: 'ASSISTANTE' }, param(), async () => [distant()])).rejects.toThrow('administrateur')
    await expect(sy.synchroniserContrats({ id: ids.comA, role: 'COMMERCIAL' }, param(), async () => [distant()])).rejects.toThrow('administrateur')
    await expect(sy.synchroniserContrats(A(), param(), async () => [])).rejects.toThrow('liste vide')
    await expect(sy.synchroniserContrats(A(), param(), async () => { throw new Error('Grenke indisponible') })).rejects.toThrow('Grenke indisponible')
  })
  it('simulation : rapport complet, aucune écriture', async () => {
    const avant = await prisma.finContrat.count()
    const r = await sy.synchroniserContrats(A(), param({ appliquer: false }), async () => [distant({ reference: 'A1L-65243' }), distant({ reference: 'NOUVEAU-1', client: 'NOUVEAU CLIENT' })])
    expect(r.simule).toBe(true)
    expect(r.rapport.connus).toBe(1)
    expect(r.rapport.nouveaux.map(n => n.reference)).toEqual(['NOUVEAU-1'])
    expect(r.rapport.ecarts.map(e => e.champ)).toEqual(['date de fin'])
    expect(await prisma.finContrat.count()).toBe(avant)
  })
  it('application : pas de doublon, valeurs vides complétées, écarts non écrasés, données saisies intactes', async () => {
    const r = await sy.synchroniserContrats(A(), param(), async () => [distant({ reference: 'A1L-65243' }), distant({ reference: 'NOUVEAU-1', client: 'NOUVEAU CLIENT' }), distant({ reference: 'VIEUX-1', etatBrut: 'Terminated' })])
    expect(r.crees).toBe(1)
    expect(await prisma.finContrat.count({ where: { raisonSociale: 'SAHAM EUROPE SAS' } })).toBe(1) // pas de doublon
    const c = await prisma.finContrat.findUniqueOrThrow({ where: { id: existant } })
    expect(c).toMatchObject({ commercialId: ids.comA, materiel: '2 × Canon C3226i corrigé à la main', banque: 'Locam', montantCommercialCentimes: 1215126, statutFinanceur: 'RunningContract' })
    expect(c.denonceLe).toEqual(jour('2026-09-01')) // décision locale conservée
    expect(c.clotureLe).toBeNull()
    expect(c.dateDebut).toEqual(jour('2026-01-01')) // vide chez nous : complétée
    expect(c.montantReelCentimes).toBe(1255208) // vide chez nous : complété
    expect(c.dateFin).toEqual(jour('2031-07-01')) // différente : conservée (signalée seulement)
    const n = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'NOUVEAU-1' } })
    expect(n).toMatchObject({ commercialId: ids.comB, materiel: 'Non précisé', importe: true, montantReelCentimes: 1255208, montantCommercialCentimes: 1215126 })
    expect(await prisma.finContrat.count({ where: { refFinanceur: 'VIEUX-1' } })).toBe(0) // terminé chez le financeur : non repris
  })
  it('deuxième passage : rien de nouveau, rien de dupliqué (idempotent)', async () => {
    const avant = await prisma.finContrat.count()
    const r = await sy.synchroniserContrats(A(), param(), async () => [distant({ reference: 'A1L-65243' }), distant({ reference: 'NOUVEAU-1', client: 'NOUVEAU CLIENT' })])
    expect(r).toMatchObject({ crees: 0, mis_a_jour: 0 })
    expect(await prisma.finContrat.count()).toBe(avant)
  })
  it('un contrat terminé chez le financeur est proposé mais pas clôturé ; sans commercial par défaut, les nouveaux contrats sont refusés', async () => {
    const r = await sy.synchroniserContrats(A(), param(), async () => [distant({ reference: 'A1L-65243', etatBrut: 'Terminated' }), distant({ reference: 'NOUVEAU-1' })])
    expect(r.rapport.aCloturer.map(x => x.ref)).toEqual(['A1L 65243'])
    expect((await prisma.finContrat.findUniqueOrThrow({ where: { id: existant } })).clotureLe).toBeNull()
    await expect(sy.synchroniserContrats(A(), param({ commercialDefautId: null }), async () => [distant({ reference: 'AUTRE-9' })])).rejects.toThrow('commercial')
  })
})
