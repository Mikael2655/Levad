// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : statut des contrats, dénonciation, solde anticipé.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Mail } from './notifications'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('statut des contrats et solde anticipé (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let ct: typeof import('./contrats')
  let rc: typeof import('./rachats')
  let notif: typeof import('./notifications')
  let ids: { admin: number; assistante: number; comA: number; comB: number; grenke: number; solubail: number }
  const mails: Mail[] = []
  const acteur = (id: number, role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL') => ({ id, role })
  const A = () => acteur(ids.admin, 'ADMIN')
  const S = () => acteur(ids.assistante, 'ASSISTANTE')
  const CA = () => acteur(ids.comA, 'COMMERCIAL')
  const CB = () => acteur(ids.comB, 'COMMERCIAL')
  const jour = (s: string) => new Date(`${s}T00:00:00Z`)
  const IL_Y_A = (mois: number) => { const x = new Date(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() - mois); x.setUTCHours(0, 0, 0, 0); return x }

  const nouveau = (o: Record<string, unknown>) => prisma.finContrat.create({
    data: { financeurId: ids.grenke, commercialId: ids.comA, raisonSociale: 'ACME', materiel: '1 × Copieur (Canon) ; 2 × Écran', periodicite: 'TRIMESTRIELLE', dureeMois: 63, loyerCentimes: 72300, montantCommercialCentimes: 1215126, montantReelCentimes: 1255208, ...o } as never,
  })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    ct = await import('./contrats')
    rc = await import('./rachats')
    notif = await import('./notifications')
    notif.remplacerExpediteur(async m => { mails.push(m) })
    await prisma.finRachat.deleteMany()
    await prisma.finNotification.deleteMany()
    await prisma.finContrat.deleteMany()
    await prisma.finDemande.deleteMany()
    await prisma.finGrille.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
    const mk = async (email: string, prenom: string, nom: string, role: string) => (await admin.creerUtilisateur({ email, prenom, nom, role })).utilisateur.id
    const [a, s, ca, cb] = [await mk('boss@t.fr', 'Boss', 'Levad', 'ADMIN'), await mk('assist@t.fr', 'Sandra', 'Assist', 'ASSISTANTE'), await mk('marie@t.fr', 'Marie', 'Durand', 'COMMERCIAL'), await mk('luc@t.fr', 'Luc', 'Petit', 'COMMERCIAL')]
    const grenke = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    const solubail = (await admin.creerFinanceur({ nom: 'Solubail', envoiParMail: true, signatureElectronique: false })).id
    ids = { admin: a, assistante: s, comA: ca, comB: cb, grenke, solubail }
  })
  afterAll(async () => {
    notif.remplacerExpediteur(null)
    await prisma?.$disconnect()
  })

  it('statuts : en cours, tacite (terme dépassé sans dénonciation), clôturé (dénoncé après terme, ou soldé)', async () => {
    await nouveau({ raisonSociale: 'En cours', dateDebut: IL_Y_A(6), dateFin: IL_Y_A(-57) })
    await nouveau({ raisonSociale: 'Tacite', dateDebut: IL_Y_A(70), dateFin: IL_Y_A(7) })
    await nouveau({ raisonSociale: 'Dénoncé', dateDebut: IL_Y_A(70), dateFin: IL_Y_A(7), denonceLe: IL_Y_A(10) })
    await nouveau({ raisonSociale: 'Soldé', dateDebut: IL_Y_A(6), dateFin: IL_Y_A(-57), clotureLe: IL_Y_A(1) })
    const noms = (l: { raisonSociale: string }[]) => l.map(x => x.raisonSociale).sort()
    expect(noms(await ct.listerContrats(S()))).toEqual(['En cours'])
    expect(noms(await ct.listerContrats(S(), { statut: 'tacite' }))).toEqual(['Tacite'])
    expect(noms(await ct.listerContrats(S(), { statut: 'cloture' }))).toEqual(['Dénoncé', 'Soldé'])
    expect(noms(await ct.listerContrats(S(), { statut: 'tous' }))).toHaveLength(4)
    const [tacite] = await ct.listerContrats(S(), { statut: 'tacite' })
    expect(tacite.reconduction).not.toBeNull()
    expect(tacite.statutContrat).toBe('TACITE')
  })

  it('dénonciation : réservée à l’admin / assistante, réversible ; dernier loyer = fin - une période', async () => {
    const c = await nouveau({ raisonSociale: 'A dénoncer', dateDebut: jour('2030-01-01'), dateFin: jour('2033-04-01') })
    await expect(ct.definirDenonciation(CA(), c.id, true)).rejects.toThrow('non autorisée')
    await ct.definirDenonciation(S(), c.id, true)
    expect((await prisma.finContrat.findUniqueOrThrow({ where: { id: c.id } })).denonceLe).not.toBeNull()
    await ct.definirDenonciation(A(), c.id, false)
    expect((await prisma.finContrat.findUniqueOrThrow({ where: { id: c.id } })).denonceLe).toBeNull()
    const fiche = await ct.lireContrat(S(), c.id)
    expect(fiche!.dernierLoyer).toEqual(jour('2033-01-01'))
    await ct.modifierContrat(S(), c.id, { materiel: 'X' }) // inchangé par ailleurs
  })

  it('référence : numéro du financeur ; Solubail : numéro de demande ; commercial : jamais le numéro du financeur', async () => {
    const demande = await prisma.finDemande.create({ data: { reference: 'LEV-2026-0042', financeurId: ids.solubail, commercialId: ids.comA, saisiParId: ids.comA, statut: 'SIGNEE', raisonSociale: 'SOL', siret: '', adresse: '', contactPrenom: '', contactNom: '', contactEmail: '', dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 1, montantCommercialCentimes: 1, coefficientCommercialPpm: 1 } as never })
    const g = await nouveau({ raisonSociale: 'Réf Grenke', refFinanceur: 'GRK-123', dateDebut: IL_Y_A(1), dateFin: IL_Y_A(-62) })
    const s = await nouveau({ raisonSociale: 'Réf Solubail', financeurId: ids.solubail, refFinanceur: 'SB-9', demandeId: demande.id, dateDebut: IL_Y_A(1), dateFin: IL_Y_A(-62) })
    expect((await ct.lireContrat(S(), g.id))!.reference).toBe('GRK-123')
    expect((await ct.lireContrat(S(), s.id))!.reference).toBe('LEV-2026-0042')
    expect((await ct.lireContrat(CA(), g.id))!.reference).toBeNull()
    expect((await ct.lireContrat(CA(), s.id))!.reference).toBe('LEV-2026-0042')
    expect(JSON.stringify(await ct.listerContrats(CA()))).not.toMatch(/GRK-123|SB-9/)
  })

  describe('solde anticipé', () => {
    let contratId: number
    beforeAll(async () => {
      // 21 trimestres de 723 € à partir du 1er jour du mois d'il y a 6 mois (loyers passés : 2 ou 3 selon la date de résiliation)
      const debut = IL_Y_A(6)
      contratId = (await nouveau({ raisonSociale: 'Solde', refFinanceur: 'GRK-SOLDE', dateDebut: debut, dateFin: new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() + 63, 1)) })).id
    })
    const dans = (mois: number) => { const x = IL_Y_A(-mois); return x.toISOString().slice(0, 10) }

    it('simulation (sans rien enregistrer) : l’interne voit le détail, le commercial seulement le total', async () => {
      const p = { type: 'NON_RENOUVELANT', dateResiliation: new Date(`${dans(1)}T00:00:00Z`) }
      const interne = (await rc.simulerSolde(S(), contratId, p)) as Record<string, number>
      expect(interne.valeurResiduelleCentimes).toBe(12552)
      expect(interne.penaliteCentimes).toBe(Math.round(interne.loyersRestantsCentimes * 0.1))
      expect(interne.totalCentimes).toBe(interne.loyersRestantsCentimes + interne.penaliteCentimes + 12552)
      const com = await rc.simulerSolde(CA(), contratId, p)
      expect(Object.keys(com).sort()).toEqual(['nbLoyersRestants', 'totalCentimes'])
      expect(com.totalCentimes).toBe(interne.totalCentimes)
      expect(await prisma.finRachat.count()).toBe(0)
    })
    it('un commercial ne simule pas le contrat d’un collègue', async () => {
      await expect(rc.simulerSolde(CB(), contratId, { type: 'RENOUVELANT', dateResiliation: jour('2030-01-01') })).rejects.toThrow('introuvable')
    })
    it('refus : type inconnu, contrat non en cours, montant réel inconnu', async () => {
      await expect(rc.simulerSolde(CA(), contratId, { type: 'X', dateResiliation: jour('2030-01-01') })).rejects.toThrow('type de solde')
      const tacite = await nouveau({ raisonSociale: 'Tacite2', dateDebut: IL_Y_A(70), dateFin: IL_Y_A(7) })
      await expect(rc.simulerSolde(S(), tacite.id, { type: 'RENOUVELANT', dateResiliation: new Date() })).rejects.toThrow('contrats en cours')
      const sansReel = await nouveau({ raisonSociale: 'SansReel', montantReelCentimes: null, dateDebut: IL_Y_A(1), dateFin: IL_Y_A(-62) })
      await expect(rc.simulerSolde(S(), sansReel.id, { type: 'RENOUVELANT', dateResiliation: new Date() })).rejects.toThrow('montant financé réel')
    })
    it('le commercial enregistre ; la vue qu’il reçoit n’a ni valeur résiduelle ni pénalité', async () => {
      const r = await rc.enregistrerRachat(CA(), contratId, { type: 'RENOUVELANT', dateResiliation: new Date(`${dans(1)}T00:00:00Z`) })
      expect(JSON.stringify(r)).not.toMatch(/valeurResiduelle|penalite|loyersRestantsCentimes/)
      expect(JSON.stringify(await rc.listerRachats(CA(), contratId))).not.toMatch(/valeurResiduelle|penalite/)
      expect(JSON.stringify(await rc.listerRachats(S(), contratId))).toContain('valeurResiduelleCentimes')
      // une nouvelle simulation remplace la précédente encore « enregistrée »
      await rc.enregistrerRachat(CA(), contratId, { type: 'NON_RENOUVELANT', dateResiliation: new Date(`${dans(2)}T00:00:00Z`) })
      const statuts = (await prisma.finRachat.findMany({ where: { contratId }, orderBy: { id: 'asc' } })).map(x => x.statut)
      expect(statuts).toEqual(['ANNULEE', 'SIMULEE'])
    })
    it('seul l’admin / l’assistante envoie : mail avec le détail, statut « envoyée »', async () => {
      const [rachat] = await prisma.finRachat.findMany({ where: { contratId, statut: 'SIMULEE' } })
      await expect(rc.envoyerRachat(CA(), rachat.id)).rejects.toThrow('Réservé')
      mails.length = 0
      await rc.envoyerRachat(S(), rachat.id)
      expect(mails).toHaveLength(1)
      expect(mails[0].to).toBe('boss@t.fr') // financeur sans destinataire choisi : l'administrateur
      expect(mails[0].texte).toContain('GRK-SOLDE')
      expect(mails[0].texte).toMatch(/Valeur résiduelle/)
      expect((await prisma.finRachat.findUniqueOrThrow({ where: { id: rachat.id } })).statut).toBe('ENVOYEE')
      await expect(rc.envoyerRachat(S(), rachat.id)).rejects.toThrow('enregistrée')
    })
    it('un échec d’envoi ne change pas le statut', async () => {
      const c2 = await nouveau({ raisonSociale: 'Echec', dateDebut: IL_Y_A(1), dateFin: IL_Y_A(-62) })
      const r = await rc.enregistrerRachat(S(), c2.id, { type: 'RENOUVELANT', dateResiliation: new Date(`${dans(3)}T00:00:00Z`) })
      notif.remplacerExpediteur(async () => { throw new Error('boum') })
      await expect(rc.envoyerRachat(S(), r.id)).rejects.toThrow('n’a pas pu être envoyé')
      notif.remplacerExpediteur(async m => { mails.push(m) })
      expect((await prisma.finRachat.findUniqueOrThrow({ where: { id: r.id } })).statut).toBe('SIMULEE')
    })
    it('offre signée : le contrat est clôturé à la date de résiliation et sort des contrats en cours', async () => {
      const [rachat] = await prisma.finRachat.findMany({ where: { contratId, statut: 'ENVOYEE' } })
      await expect(rc.changerStatutRachat(CA(), rachat.id, 'SIGNEE')).rejects.toThrow('non autorisée')
      await rc.changerStatutRachat(A(), rachat.id, 'SIGNEE')
      const c = await prisma.finContrat.findUniqueOrThrow({ where: { id: contratId } })
      expect(c.clotureLe).toEqual(rachat.dateResiliation)
      expect(c.clotureMotif).toBe('Solde non renouvelant')
      expect((await ct.listerContrats(S())).some(x => x.id === contratId)).toBe(false)
      expect((await ct.listerContrats(S(), { statut: 'cloture' })).some(x => x.id === contratId)).toBe(true)
      await expect(rc.simulerSolde(S(), contratId, { type: 'RENOUVELANT', dateResiliation: new Date() })).rejects.toThrow('contrats en cours')
    })
    it('le commercial peut annuler sa propre simulation, pas celle d’un autre ni une demande envoyée', async () => {
      const c3 = await nouveau({ raisonSociale: 'Annul', dateDebut: IL_Y_A(1), dateFin: IL_Y_A(-62) })
      const r = await rc.enregistrerRachat(CA(), c3.id, { type: 'RENOUVELANT', dateResiliation: new Date(`${dans(3)}T00:00:00Z`) })
      await expect(rc.changerStatutRachat(CB(), r.id, 'ANNULEE')).rejects.toThrow('non autorisée')
      await rc.changerStatutRachat(CA(), r.id, 'ANNULEE')
      expect((await prisma.finRachat.findUniqueOrThrow({ where: { id: r.id } })).statut).toBe('ANNULEE')
    })
  })
})
