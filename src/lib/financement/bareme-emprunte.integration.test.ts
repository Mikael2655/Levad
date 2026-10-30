// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : financeur sans barème commercial qui reprend celui d'un autre (BNP avec les taux Grenke).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('barème commercial emprunté (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let ct: typeof import('./contrats')
  let ids: { admin: number; comA: number; grenke: number; bnp: number }
  const A = () => ({ id: ids.admin, role: 'ADMIN' as const })
  const CA = () => ({ id: ids.comA, role: 'COMMERCIAL' as const })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    ct = await import('./contrats')
    await prisma.finRachat.deleteMany()
    await prisma.finContrat.deleteMany()
    await prisma.finDemande.deleteMany()
    await prisma.finGrille.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
    const mk = async (email: string, role: string) => (await admin.creerUtilisateur({ email, prenom: 'P', nom: email.split('@')[0], role })).utilisateur.id
    const [a, ca] = [await mk('boss@t.fr', 'ADMIN'), await mk('ca@t.fr', 'COMMERCIAL')]
    const grenke = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    await admin.enregistrerGrille({ financeurId: grenke, type: 'REELLE', utilisateurId: null }, 'MENSUEL', lignesVersMatrice(GRENKE_REEL_LIGNES))
    await admin.enregistrerGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES))
    const bnp = (await admin.creerFinanceur({ nom: 'BNP Leasing Solutions' })).id
    ids = { admin: a, comA: ca, grenke, bnp }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  const fichier = [
    ['Raison sociale du client', 'N° Contrat', 'Date début', 'Date fin', 'Loyer', 'Total'],
    ['SAHAM EUROPE SAS', 'A1L65243', '01/07/2022', '01/10/2027', '723,00', '12 552,08'],
    ['AMG CONSEIL', 'Y0013405', '25/01/2016', '01/07/2027', '100,00', '2 345,00'],
  ]
  const mapping = { client: 0, ref: 1, dateDebut: 2, dateFin: 3, loyer: 4, montantReel: 5 }
  const importer = (simuler: boolean) => ct.traiterImport(A(), { financeurId: ids.bnp, lignes: fichier.slice(1), mapping, uniteDuree: 'MOIS', uniteLoyer: 'PAR_PERIODE', periodiciteDefaut: 'TRIMESTRIELLE', commercialDefautId: ids.comA, statutsRetenus: null, simuler })

  it('sans emprunt : le montant commercial reste vide', async () => {
    const r = await importer(true)
    expect(r.lignes[0]).toMatchObject({ etat: 'OK', montantReelCentimes: 1255208, montantCommercialCentimes: null })
  })
  it('refus : emprunter son propre barème ou un financeur inconnu', async () => {
    await expect(admin.modifierFinanceur(ids.bnp, { baremeCommercialDeId: ids.bnp })).rejects.toThrow('propre barème')
    await expect(admin.modifierFinanceur(ids.bnp, { baremeCommercialDeId: 99999 })).rejects.toThrow('introuvable')
  })
  it('avec les taux Grenke : montant commercial recalculé à partir du loyer, montant réel = « Total » du fichier', async () => {
    await admin.modifierFinanceur(ids.bnp, { baremeCommercialDeId: ids.grenke })
    const r = await importer(false)
    expect(r.importes).toBe(2)
    const c = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'A1L65243' } })
    expect(c).toMatchObject({ dureeMois: 63, loyerCentimes: 72300, montantReelCentimes: 1255208, montantCommercialCentimes: 1215126 }) // 723 € / 5,95 %, comme pour Grenke
    // la durée de l'autre contrat (138 mois) n'existe pas dans le barème : pas de montant commercial inventé
    const autre = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'Y0013405' } })
    expect(autre.montantCommercialCentimes).toBeNull()
  })
  it('le commercial voit le montant commercial (taux Grenke) et jamais le montant réel BNP', async () => {
    const json = JSON.stringify(await ct.listerContrats(CA()))
    expect(json).toContain('1215126')
    expect(json).not.toMatch(/montantReel|1255208/)
  })
  it('un barème propre au financeur reste prioritaire sur l’emprunt', async () => {
    await admin.enregistrerGrille({ financeurId: ids.bnp, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES.map(l => ({ ...l, coefficientBp: l.coefficientBp + 100 }))))
    const g = await admin.grilleCommercialePour(ids.bnp, ids.comA)
    expect(g!.lignes[0].coefficientBp).toBe(COMMERCIAL_LIGNES[0].coefficientBp + 100)
  })
})
