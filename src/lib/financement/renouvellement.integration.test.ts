// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : renouvellement = nouvelle demande qui intègre le solde d'un contrat.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES, SOLUBAIL_COMMERCIAL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'
import type { EntreeDemande } from './demandes'
import type { Mail } from './notifications'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('renouvellement avec rachat intégré (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let dem: typeof import('./demandes')
  let acces: typeof import('./acces')
  let rc: typeof import('./rachats')
  let notif: typeof import('./notifications')
  let ids: { admin: number; assistante: number; comA: number; comB: number; grenke: number; solubail: number }
  const mails: Mail[] = []
  const acteur = (id: number, role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL') => ({ id, role })
  const A = () => acteur(ids.admin, 'ADMIN')
  const S = () => acteur(ids.assistante, 'ASSISTANTE')
  const CA = () => acteur(ids.comA, 'COMMERCIAL')
  const CB = () => acteur(ids.comB, 'COMMERCIAL')
  const IL_Y_A = (mois: number) => { const x = new Date(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() - mois); x.setUTCHours(0, 0, 0, 0); return x }
  const dans = (mois: number) => IL_Y_A(-mois)

  const entree = (o: Partial<EntreeDemande> = {}): EntreeDemande => ({
    financeurId: ids.grenke, commercialId: null, raisonSociale: 'ACME SAS', siret: '35600000000048', formeJuridique: 'SAS',
    adresse: '6 rue du Port', codePostal: '67300', ville: 'Schiltigheim', pays: 'France',
    contactPrenom: 'Jean', contactNom: 'Dupont', contactEmail: 'jean@acme.fr', contactTel: null,
    dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 100000, montantCentimes: null,
    lignes: [{ designation: 'Copieur C3226i', quantite: 1, montantHtCentimes: null, typeBien: null, constructeur: 'Canon' }],
    ...o,
  })
  const ancienContrat = (o: Record<string, unknown> = {}) => prisma.finContrat.create({
    data: { financeurId: ids.grenke, commercialId: ids.comA, raisonSociale: 'ACME SAS', siret: '35600000000048', refFinanceur: 'GRK-OLD', materiel: 'Ancien copieur', periodicite: 'TRIMESTRIELLE', dureeMois: 63, loyerCentimes: 72300, montantCommercialCentimes: 1215126, montantReelCentimes: 1255208, dateDebut: IL_Y_A(6), dateFin: dans(57), ...o } as never,
  })
  const solde = async (contratId: number, a = CA()) => (await rc.enregistrerRachat(a, contratId, { type: 'RENOUVELANT', dateResiliation: dans(1) })).id

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    dem = await import('./demandes')
    acces = await import('./acces')
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
    const mk = async (email: string, role: string) => (await admin.creerUtilisateur({ email, prenom: 'P', nom: email.split('@')[0], role })).utilisateur.id
    const [a, s, ca, cb] = [await mk('boss@t.fr', 'ADMIN'), await mk('assist@t.fr', 'ASSISTANTE'), await mk('ca@t.fr', 'COMMERCIAL'), await mk('cb@t.fr', 'COMMERCIAL')]
    const grenke = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    await admin.enregistrerGrille({ financeurId: grenke, type: 'REELLE', utilisateurId: null }, 'MENSUEL', lignesVersMatrice(GRENKE_REEL_LIGNES))
    await admin.enregistrerGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES))
    const solubail = (await admin.creerFinanceur({ nom: 'Solubail', envoiParMail: true, signatureElectronique: false })).id
    await admin.modifierFinanceur(solubail, { destinataireMailId: s })
    await admin.enregistrerGrille({ financeurId: solubail, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(SOLUBAIL_COMMERCIAL_LIGNES))
    ids = { admin: a, assistante: s, comA: ca, comB: cb, grenke, solubail }
  })
  afterAll(async () => {
    notif.remplacerExpediteur(null)
    await prisma?.$disconnect()
  })

  it('la demande de renouvellement intègre le solde : lien enregistré, historique, vue du commercial sans valeur résiduelle', async () => {
    const c = await ancienContrat()
    const rachatId = await solde(c.id)
    const { id } = await dem.creerDemande(CA(), entree({ rachatId }))
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).rachatId).toBe(rachatId)
    const fiche = await acces.lireDemande(CA(), id)
    expect(fiche!.rachat).toMatchObject({ id: rachatId, type: 'RENOUVELANT', contratClient: 'ACME SAS' })
    expect(JSON.stringify(fiche)).not.toMatch(/valeurResiduelle|penalite|montantReel|marge/)
    const h = await prisma.finHistorique.findFirstOrThrow({ where: { demandeId: id } })
    expect(h.commentaire).toContain('renouvellement')
    const liste = await rc.listerRachats(CA(), c.id)
    expect(liste[0].demande?.id).toBe(id)
  })
  it('refus : rachat plus gros que le montant financé, déjà lié, annulé, ou d’un autre commercial', async () => {
    const c = await ancienContrat({ raisonSociale: 'Autre' })
    const rachatId = await solde(c.id)
    await expect(dem.creerDemande(CA(), entree({ loyerCentimes: 5000, rachatId }))).rejects.toThrow('dépasse le montant financé')
    await expect(dem.creerDemande(CB(), entree({ rachatId }))).rejects.toThrow('introuvable')
    const { id } = await dem.creerDemande(CA(), entree({ rachatId }))
    await expect(dem.creerDemande(CA(), entree({ rachatId }))).rejects.toThrow('déjà intégré')
    // la modification de la demande liée garde (ou retire) son propre lien
    await dem.modifierDemande(CA(), id, entree({ rachatId }))
    await dem.modifierDemande(CA(), id, entree({ rachatId: null }))
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).rachatId).toBeNull()
    await rc.changerStatutRachat(CA(), rachatId, 'ANNULEE')
    await expect(dem.creerDemande(CA(), entree({ rachatId }))).rejects.toThrow('plus disponible')
  })
  it('un solde intégré ne se re-simule pas, ne s’envoie pas séparément et ne s’annule pas tant que la demande vit', async () => {
    const c = await ancienContrat({ raisonSociale: 'Lien' })
    const rachatId = await solde(c.id)
    const { id } = await dem.creerDemande(CA(), entree({ rachatId }))
    await expect(rc.enregistrerRachat(CA(), c.id, { type: 'NON_RENOUVELANT', dateResiliation: dans(2) })).rejects.toThrow('intégré à la demande')
    await expect(rc.envoyerRachat(S(), rachatId)).rejects.toThrow('intégré')
    await expect(rc.changerStatutRachat(S(), rachatId, 'ANNULEE')).rejects.toThrow('intégré à la demande')
    await dem.changerStatut(CA(), id, { statut: 'ANNULEE' })
    await rc.changerStatutRachat(S(), rachatId, 'ANNULEE') // demande annulée : le solde se libère
  })
  it('signature de la demande de renouvellement : le contrat remplacé est clôturé à la date de résiliation', async () => {
    const c = await ancienContrat({ raisonSociale: 'Remplacé' })
    const rachatId = await solde(c.id)
    const resiliation = (await prisma.finRachat.findUniqueOrThrow({ where: { id: rachatId } })).dateResiliation
    const { id, reference } = await dem.creerDemande(CA(), entree({ rachatId }))
    await dem.changerStatut(S(), id, { statut: 'ENVOYEE' })
    await dem.changerStatut(S(), id, { statut: 'PRETE_A_SIGNER' })
    await dem.envoyerEnSignature(CA(), id, { prenom: 'J', nom: 'D', email: 'j@acme.fr' }, { prenom: 'M', nom: 'D', email: 'boss@t.fr' })
    await dem.changerStatut(S(), id, { statut: 'SIGNEE' })
    const vieux = await prisma.finContrat.findUniqueOrThrow({ where: { id: c.id } })
    expect(vieux.clotureLe).toEqual(resiliation)
    expect(vieux.clotureMotif).toBe(`Renouvelé (demande ${reference})`)
    expect((await prisma.finRachat.findUniqueOrThrow({ where: { id: rachatId } })).statut).toBe('SIGNEE')
    expect(await prisma.finContrat.count({ where: { demandeId: id } })).toBe(1) // le nouveau contrat existe
  })
  it('financeur sans API (Solubail) : le rachat est dans le mail, et la mise en place clôture l’ancien contrat', async () => {
    const c = await ancienContrat({ raisonSociale: 'Chez Solubail' })
    const rachatId = await solde(c.id)
    const { id } = await dem.creerDemande(CA(), entree({ financeurId: ids.solubail, rachatId }))
    mails.length = 0
    await dem.changerStatut(CA(), id, { statut: 'ENVOYEE' })
    const t = mails.find(m => m.to === 'assist@t.fr')!.texte
    expect(t).toContain('Rachat de contrat intégré')
    expect(t).toContain('GRK-OLD')
    await dem.changerStatut(S(), id, { statut: 'PRETE_A_SIGNER', montantReelCentimes: 1500000 })
    await dem.mettreEnPlaceContrat(S(), id, { montantReelCentimes: 1500000, banque: 'Locam', dateDebut: dans(2) })
    expect((await prisma.finContrat.findUniqueOrThrow({ where: { id: c.id } })).clotureLe).not.toBeNull()
  })
})
