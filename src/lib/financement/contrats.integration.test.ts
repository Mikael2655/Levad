// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : base jetable, vidée par le test.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'
import type { EntreeDemande } from './demandes'
import { ajouterMois } from './echeances'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('contrats (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let dem: typeof import('./demandes')
  let ct: typeof import('./contrats')
  let ids: { admin: number; assistante: number; comA: number; comB: number; grenke: number }
  const acteur = (id: number, role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL') => ({ id, role })
  const A = () => acteur(ids.admin, 'ADMIN')
  const S = () => acteur(ids.assistante, 'ASSISTANTE')
  const CA = () => acteur(ids.comA, 'COMMERCIAL')
  const CB = () => acteur(ids.comB, 'COMMERCIAL')
  const jour = (s: string) => new Date(`${s}T00:00:00Z`)

  const entree = (o: Partial<EntreeDemande> = {}): EntreeDemande => ({
    financeurId: ids.grenke, commercialId: null, raisonSociale: 'ACME SAS', siret: '35600000000048', formeJuridique: 'SAS',
    adresse: '6 rue du Port', codePostal: '67300', ville: 'Schiltigheim', pays: 'France',
    contactPrenom: 'Jean', contactNom: 'Dupont', contactEmail: 'jean@acme.fr', contactTel: null,
    dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300, montantCentimes: null,
    lignes: [{ designation: 'Copieur C3226i', quantite: 2, montantHtCentimes: null, typeBien: null, constructeur: 'Canon' }, { designation: 'Contrat de maintenance', quantite: 1, montantHtCentimes: null, typeBien: null, constructeur: null }],
    ...o,
  })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    dem = await import('./demandes')
    ct = await import('./contrats')
    await prisma.finContrat.deleteMany()
    await prisma.finDemande.deleteMany()
    await prisma.finGrille.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
    const mk = async (email: string, prenom: string, nom: string, role: string) => (await admin.creerUtilisateur({ email, prenom, nom, role })).utilisateur.id
    const [a, s, ca, cb] = [await mk('boss@t.fr', 'Boss', 'Levad', 'ADMIN'), await mk('assist@t.fr', 'Sandra', 'Assist', 'ASSISTANTE'), await mk('marie@t.fr', 'Marie', 'Durand', 'COMMERCIAL'), await mk('luc@t.fr', 'Luc', 'Petit', 'COMMERCIAL')]
    const grenke = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    await admin.enregistrerGrille({ financeurId: grenke, type: 'REELLE', utilisateurId: null }, 'MENSUEL', lignesVersMatrice(GRENKE_REEL_LIGNES))
    await admin.enregistrerGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES))
    ids = { admin: a, assistante: s, comA: ca, comB: cb, grenke }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  describe('création à la signature', () => {
    let demandeId: number
    beforeAll(async () => {
      demandeId = (await dem.creerDemande(CA(), entree())).id
      await dem.changerStatut(S(), demandeId, { statut: 'ENVOYEE', refFinanceur: 'GRK-77' })
      await dem.changerStatut(CA(), demandeId, { statut: 'PRETE_A_SIGNER' })
      await dem.envoyerEnSignature(CA(), demandeId, { prenom: 'J', nom: 'D', email: 'j@acme.fr' }, { prenom: 'M', nom: 'D', email: 'm@levad.fr' })
    })
    it('pas de contrat tant que la demande n’est pas signée', async () => {
      expect(await prisma.finContrat.count({ where: { demandeId } })).toBe(0)
    })
    it('« Signée » crée le contrat avec les montants de la demande ; le 1er loyer reste à renseigner', async () => {
      await dem.changerStatut(CA(), demandeId, { statut: 'SIGNEE' })
      const c = await prisma.finContrat.findUniqueOrThrow({ where: { demandeId } })
      expect(c).toMatchObject({ importe: false, financeurId: ids.grenke, commercialId: ids.comA, raisonSociale: 'ACME SAS', periodicite: 'TRIMESTRIELLE', dureeMois: 63, loyerCentimes: 72300, montantCommercialCentimes: 1215126, montantReelCentimes: 1255208, dateDebut: null, dateFin: null })
      expect(c.materiel).toBe('2 × Copieur C3226i (Canon) ; 1 × Contrat de maintenance')
    })
    it('la demande signée n’est plus modifiable, même par l’admin', async () => {
      await expect(dem.modifierDemande(A(), demandeId, entree())).rejects.toThrow('plus être modifiée')
    })
    it('renseigner le 1er loyer calcule la fin ; fin avant début refusée ; commercial : lecture seule', async () => {
      const id = (await prisma.finContrat.findUniqueOrThrow({ where: { demandeId } })).id
      await expect(ct.modifierContrat(CA(), id, { dateDebut: jour('2026-01-01') })).rejects.toThrow('non autorisée')
      await ct.modifierContrat(S(), id, { dateDebut: jour('2026-01-01') })
      expect((await prisma.finContrat.findUniqueOrThrow({ where: { id } })).dateFin?.toISOString().slice(0, 10)).toBe('2031-04-01')
      await expect(ct.modifierContrat(A(), id, { dateFin: jour('2025-12-31') })).rejects.toThrow('postérieure')
      await ct.modifierContrat(A(), id, { dateFin: jour('2031-03-31'), refFinanceur: ' GRK-77-B ' })
      expect(await prisma.finContrat.findUniqueOrThrow({ where: { id } })).toMatchObject({ refFinanceur: 'GRK-77-B' })
    })
  })

  describe('visibilité et alertes d’échéance', () => {
    beforeAll(async () => {
      await prisma.finContrat.deleteMany()
      const maintenant = new Date()
      const base = { financeurId: ids.grenke, materiel: 'm', periodicite: 'TRIMESTRIELLE', dureeMois: 63, loyerCentimes: 72300, montantCommercialCentimes: 1215126, montantReelCentimes: 1255208, importe: true }
      await prisma.finContrat.createMany({
        data: [
          { ...base, commercialId: ids.comA, raisonSociale: 'Proche A', dateFin: ajouterMois(maintenant, 3), refFinanceur: 'SECRET-REF' },
          { ...base, commercialId: ids.comA, raisonSociale: 'Lointain A', dateFin: ajouterMois(maintenant, 30) },
          { ...base, commercialId: ids.comA, raisonSociale: 'Echu A', dateFin: ajouterMois(maintenant, -2) },
          { ...base, commercialId: ids.comA, raisonSociale: 'Sans date A', dateFin: null },
          { ...base, commercialId: ids.comB, raisonSociale: 'Proche B', dateFin: ajouterMois(maintenant, 5) },
        ],
      })
    })
    const noms = (l: { raisonSociale: string }[]) => l.map(x => x.raisonSociale)

    it('un commercial ne voit que ses contrats ; l’interne voit tout', async () => {
      expect(noms(await ct.listerContrats(CA()))).toEqual(['Echu A', 'Proche A', 'Lointain A', 'Sans date A'])
      expect(noms(await ct.listerContrats(CB()))).toEqual(['Proche B'])
      expect(await ct.listerContrats(S())).toHaveLength(5) // « en cours » comprend les contrats en reconduction tacite
      expect((await ct.listerContrats(CA(), { commercialId: ids.comB })).every(c => c.commercialId === ids.comA)).toBe(true)
    })
    it('aucune donnée réelle ne part vers un commercial', async () => {
      const json = JSON.stringify(await ct.listerContrats(CA(), { statut: 'tous' }))
      for (const interdit of ['montantReel', 'marge', '1255208', 'SECRET-REF']) expect(json).not.toContain(interdit)
      expect(json).toContain('1215126')
      expect(JSON.stringify(await ct.listerContrats(S()))).toContain('1255208')
    })
    it('filtres d’échéance et tri par date de fin', async () => {
      expect(noms(await ct.listerContrats(S(), { echeance: 'proche6' }))).toEqual(['Proche A', 'Proche B'])
      expect(noms(await ct.listerContrats(S(), { statut: 'en_cours' }))).toContain('Echu A')
      expect(noms(await ct.listerContrats(S(), { echeance: 'proche12' }))).toEqual(['Proche A', 'Proche B'])
      expect(noms(await ct.listerContrats(S(), { statut: 'tous' }))).toEqual(['Echu A', 'Proche A', 'Proche B', 'Lointain A', 'Sans date A'])
      expect(noms(await ct.listerContrats(S(), { q: 'lointain' }))).toEqual(['Lointain A'])
    })
    it('mois restants et état d’échéance calculés', async () => {
      const [proche] = await ct.listerContrats(CA(), { echeance: 'proche6' })
      expect(proche).toMatchObject({ etat: 'PROCHE', moisRestants: 3 })
      expect((await ct.listerContrats(S(), { q: 'Echu A' }))[0]).toMatchObject({ etat: 'ECHU', moisRestants: 0, statutContrat: 'TACITE' })
    })
    it('compteur d’échéances proches (bandeau)', async () => {
      expect(await ct.compterEcheancesProches(CA())).toBe(1)
      expect(await ct.compterEcheancesProches(S())).toBe(2)
    })
    it('fiche : introuvable pour un autre commercial', async () => {
      const [procheA] = await ct.listerContrats(CA(), { q: 'Proche A' })
      expect(await ct.lireContrat(CB(), procheA.id)).toBeNull()
      expect(await ct.lireContrat(CA(), procheA.id)).not.toBeNull()
    })
  })

  describe('import des contrats existants', () => {
    // colonnes : 0 N° contrat, 1 client, 2 loyer, 3 durée, 4 commercial, 5 montant financé, 6 date 1er loyer
    const mapping = { ref: 0, client: 1, loyer: 2, duree: 3, commercial: 4, montantReel: 5, dateDebut: 6 }
    const base = (lignes: string[][], o: Partial<import('./contrats').DemandeImport> = {}) => ({
      financeurId: ids.grenke, lignes, mapping, uniteDuree: 'MOIS' as const, uniteLoyer: 'PAR_PERIODE' as const, periodiciteDefaut: 'TRIMESTRIELLE' as const, commercialDefautId: null, statutsRetenus: null, simuler: false, ...o,
    })
    const fichier = [
      ['G-001', 'Alpha SARL', '723,00', '63', 'marie@t.fr', '12 552,08', '01/01/2025'],
      ['G-002', 'Beta SAS', '500,00', '21T', 'Luc Petit', '', ''],
      ['G-003', 'Gamma', '100,00', '36', 'Inconnu Personne', '3 000,00', ''],
      ['G-004', 'Delta', 'abc', '36', 'marie@t.fr', '', ''],
      ['G-001', 'Alpha (doublon dans le fichier)', '723,00', '63', 'marie@t.fr', '', ''],
    ]
    beforeAll(async () => { await prisma.finContrat.deleteMany() })

    it('réservé à l’interne', async () => {
      await expect(ct.traiterImport(CA(), base(fichier))).rejects.toThrow('non autorisée')
    })
    it('colonnes obligatoires', async () => {
      await expect(ct.traiterImport(A(), base(fichier, { mapping: { client: 1 } }))).rejects.toThrow('colonne')
    })
    it('simulation : rapport complet, rien n’est écrit', async () => {
      const r = await ct.traiterImport(A(), base(fichier, { simuler: true }))
      expect(r).toMatchObject({ simule: true, importes: 2, doublons: 1, ignores: 0, erreurs: 2 })
      expect(await prisma.finContrat.count()).toBe(0)
      const messages = r.lignes.map(l => `${l.numero}:${l.etat}`)
      expect(messages).toEqual(['2:OK', '3:OK', '4:ERREUR', '5:ERREUR', '6:DOUBLON'])
      expect(r.lignes[2].message).toContain('Commercial introuvable')
      expect(r.lignes[3].message).toContain('loyer illisible')
    })
    it('import : loyer conservé, montant réel du fichier, montant commercial RECALCULÉ avec la grille du commercial', async () => {
      await ct.traiterImport(A(), base(fichier))
      const alpha = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'G-001' } })
      expect(alpha).toMatchObject({ importe: true, commercialId: ids.comA, loyerCentimes: 72300, montantReelCentimes: 1255208, montantCommercialCentimes: 1215126, dureeMois: 63 })
      expect(alpha.dateDebut?.toISOString().slice(0, 10)).toBe('2025-01-01')
      expect(alpha.dateFin?.toISOString().slice(0, 10)).toBe('2030-04-01')
    })
    it('commercial reconnu par son nom ; montant réel absent -> calculé avec le barème réel ; 21T = 63 mois', async () => {
      const beta = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'G-002' } })
      expect(beta).toMatchObject({ commercialId: ids.comB, dureeMois: 63 })
      expect(beta.montantReelCentimes).toBe(Math.round((50000 * 1_000_000) / 57900)) // 500 € / 5,79 % : 8 635,58 € tombe dans la tranche 5 001 – 12 500 €
      expect(beta.montantCommercialCentimes).toBe(Math.round((50000 * 1_000_000) / 60500)) // 500 € / 6,05 % (tranche 0 – 10 000 €)
    })
    it('ré-importer le même fichier ne crée aucun doublon ; un commercial par défaut rattrape les inconnus', async () => {
      const r = await ct.traiterImport(A(), base(fichier))
      expect(r).toMatchObject({ importes: 0, doublons: 3 })
      const r2 = await ct.traiterImport(A(), base(fichier, { commercialDefautId: ids.comA }))
      expect(r2).toMatchObject({ importes: 1, doublons: 3, erreurs: 1 })
      const gamma = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'G-003' } })
      expect(gamma.commercialId).toBe(ids.comA)
      expect(await prisma.finContrat.count()).toBe(3)
    })
  })

  describe('export réel Grenke : loyer mensuel, statuts, attribution aux commerciaux', () => {
    // colonnes : 0 N° contrat, 1 statut, 2 client, 3 durée, 4 montant financé, 5 loyer (mensuel), 6 début, 7 fin
    const mapping = { ref: 0, statut: 1, client: 2, duree: 3, montantReel: 4, loyer: 5, dateDebut: 6, dateFin: 7 }
    const lignes = [
      ['G-200', 'RunningContract', 'Client X', '63', '27253.89', '526', '2026-07-01', '2031-10-01'],
      ['G-201', 'ApplicationSettled', 'Client Y', '24', '4094.83', '190', '2027-01-01', '2029-01-01'],
      ['G-202', 'DefectiveContract', 'Client Z', '63', '11025.64', '215', '2026-07-01', '2031-10-01'],
    ]
    const demande = (o: Partial<import('./contrats').DemandeImport> = {}) => ({
      financeurId: ids.grenke, lignes, mapping, uniteDuree: 'MOIS' as const, uniteLoyer: 'PAR_MOIS' as const, periodiciteDefaut: 'TRIMESTRIELLE' as const,
      commercialDefautId: ids.comA, statutsRetenus: ['RunningContract', 'ApplicationSettled'], simuler: false, ...o,
    })
    beforeAll(async () => { await prisma.finContrat.deleteMany() })

    it('loyer mensuel du fichier converti en loyer trimestriel ; statut non retenu ignoré ; statut conservé', async () => {
      const r = await ct.traiterImport(A(), demande())
      expect(r).toMatchObject({ importes: 2, ignores: 1, erreurs: 0 })
      expect(r.lignes.find(l => l.numero === 4)).toMatchObject({ etat: 'IGNORE', message: 'Statut non retenu : DefectiveContract' })
      const x = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'G-200' } })
      expect(x).toMatchObject({ statutFinanceur: 'RunningContract', loyerCentimes: 157800, montantReelCentimes: 2725389, periodicite: 'TRIMESTRIELLE', dureeMois: 63, commercialId: ids.comA })
      expect(x.montantCommercialCentimes).toBe(Math.round((157800 * 1_000_000) / 58500)) // 1 578 € / 5,85 % (barème commercial, tranche 25 000 € et plus)
      expect(x.dateFin?.toISOString().slice(0, 10)).toBe('2031-10-01')
    })
    it('durée absente du barème commercial (24 mois) : contrat importé, montant commercial non calculable', async () => {
      const y = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'G-201' } })
      expect(y).toMatchObject({ loyerCentimes: 57000, dureeMois: 24, montantCommercialCentimes: null, statutFinanceur: 'ApplicationSettled' })
    })
    it('le défaut ignoré peut être importé en le cochant', async () => {
      const r = await ct.traiterImport(A(), demande({ statutsRetenus: null }))
      expect(r).toMatchObject({ importes: 1, doublons: 2, ignores: 0 })
    })
    it('réattribuer un contrat à un autre commercial recalcule son montant commercial avec la grille de celui-ci', async () => {
      const m = lignesVersMatrice(COMMERCIAL_LIGNES)
      m.cellules[5] = [5.5, 5.4, 5.3] // 63 mois
      await admin.creerGrillePropre(ids.grenke, ids.comB)
      await admin.enregistrerGrille({ financeurId: ids.grenke, type: 'COMMERCIALE', utilisateurId: ids.comB }, 'TRIMESTRIEL', m)
      const x = await prisma.finContrat.findFirstOrThrow({ where: { refFinanceur: 'G-200' } })
      await expect(ct.modifierContrat(CA(), x.id, { commercialId: ids.comB })).rejects.toThrow('non autorisée')
      await expect(ct.modifierContrat(A(), x.id, { commercialId: ids.assistante })).rejects.toThrow('Commercial invalide')
      await ct.modifierContrat(S(), x.id, { commercialId: ids.comB })
      const apres = await prisma.finContrat.findUniqueOrThrow({ where: { id: x.id } })
      expect(apres).toMatchObject({ commercialId: ids.comB, loyerCentimes: 157800, montantReelCentimes: 2725389 })
      expect(apres.montantCommercialCentimes).toBe(Math.round((157800 * 1_000_000) / 53000))
      expect(await ct.lireContrat(CA(), x.id)).toBeNull() // l'ancien commercial ne le voit plus
      expect(await ct.lireContrat(CB(), x.id)).not.toBeNull()
    })
  })
})
