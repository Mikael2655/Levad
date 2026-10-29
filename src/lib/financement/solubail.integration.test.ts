// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : financeur sans API ni barème réel (Solubail),
// e-mails de notification, mise en place du contrat, transfert de portefeuille.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, SOLUBAIL_COMMERCIAL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'
import type { EntreeDemande } from './demandes'
import type { Mail } from './notifications'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('Solubail, notifications et transfert (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let dem: typeof import('./demandes')
  let acces: typeof import('./acces')
  let contrats: typeof import('./contrats')
  let notif: typeof import('./notifications')
  let ids: { admin: number; assistante: number; comA: number; comB: number; solubail: number }
  const envoyes: Mail[] = []
  const acteur = (id: number, role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL') => ({ id, role })
  const A = () => acteur(ids.admin, 'ADMIN')
  const S = () => acteur(ids.assistante, 'ASSISTANTE')
  const CA = () => acteur(ids.comA, 'COMMERCIAL')
  const vers = (email: string) => envoyes.filter(m => m.to === email)

  const entree = (o: Partial<EntreeDemande> = {}): EntreeDemande => ({
    financeurId: ids.solubail, commercialId: null, raisonSociale: 'ACME SAS', siret: '35600000000048', formeJuridique: 'SAS',
    adresse: '6 rue du Port', codePostal: '67300', ville: 'Schiltigheim', pays: 'France',
    contactPrenom: 'Jean', contactNom: 'Dupont', contactEmail: 'jean@acme.fr', contactTel: null,
    dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300, montantCentimes: null,
    lignes: [{ designation: 'Copieur C3226i', quantite: 2, montantHtCentimes: null, typeBien: null, constructeur: 'Canon' }],
    ...o,
  })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    dem = await import('./demandes')
    acces = await import('./acces')
    contrats = await import('./contrats')
    notif = await import('./notifications')
    notif.remplacerExpediteur(async m => { envoyes.push(m) })
    await prisma.finNotification.deleteMany()
    await prisma.finParametre.deleteMany()
    await prisma.finContrat.deleteMany()
    await prisma.finDemande.deleteMany()
    await prisma.finGrille.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
    const mk = async (email: string, role: string) => (await admin.creerUtilisateur({ email, prenom: 'P', nom: email.split('@')[0], role })).utilisateur.id
    const [a, s, ca, cb] = [await mk('boss@t.fr', 'ADMIN'), await mk('assist@t.fr', 'ASSISTANTE'), await mk('ca@t.fr', 'COMMERCIAL'), await mk('cb@t.fr', 'COMMERCIAL')]
    const solubail = (await admin.creerFinanceur({ nom: 'Solubail', signatureElectronique: false, envoiParMail: true })).id
    await admin.modifierFinanceur(solubail, { destinataireMailId: s })
    await admin.enregistrerGrille({ financeurId: solubail, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(SOLUBAIL_COMMERCIAL_LIGNES))
    ids = { admin: a, assistante: s, comA: ca, comB: cb, solubail }
  })
  afterAll(async () => {
    notif.remplacerExpediteur(null)
    await prisma?.$disconnect()
  })

  let demandeId = 0

  it('sans barème réel : la demande se calcule avec le barème commercial, sans montant réel ni marge', async () => {
    const r = await dem.creerDemande(CA(), entree())
    demandeId = r.id
    const brut = await prisma.finDemande.findUniqueOrThrow({ where: { id: demandeId } })
    expect(brut.montantReelCentimes).toBeNull()
    expect(brut.montantCommercialCentimes).toBe(Math.round(72300 / 0.065)) // 21 trimestres : 6,60 % donnerait 10 954 € (> 10 000 €) donc tranche suivante, 6,50 %
  })
  it('à « Envoyée », le récapitulatif part vers l’assistante choisie (SIREN, loyer, périodicité, durée en trimestres, matériel)', async () => {
    await dem.changerStatut(CA(), demandeId, { statut: 'ENVOYEE' })
    const mails = vers('assist@t.fr')
    expect(mails).toHaveLength(1)
    const t = mails[0].texte
    expect(t).toContain('356000000')
    expect(t).toContain('ACME SAS')
    expect(t).toContain('21 trimestres')
    expect(t).toMatch(/trimestrielle/i)
    expect(t).toContain('2 × Copieur C3226i')
    expect(mails[0].sujet).toContain('Solubail')
  })
  it('l’assistante peut renvoyer le mail ; le commercial non', async () => {
    await dem.renvoyerMailFinanceur(S(), demandeId)
    expect(vers('assist@t.fr')).toHaveLength(2)
    await expect(dem.renvoyerMailFinanceur(CA(), demandeId)).rejects.toThrow('Réservé')
  })
  it('retour du financeur (pièces, accord) : le commercial est prévenu ; l’auteur n’est jamais prévenu de sa propre action', async () => {
    await dem.changerStatut(S(), demandeId, { statut: 'INFOS_MANQUANTES', infosManquantes: 'Dernier bilan' })
    expect(vers('ca@t.fr').map(m => m.sujet).join('|')).toContain('Pièces complémentaires')
    expect(vers('ca@t.fr')[0].texte).toContain('Dernier bilan')
    await dem.changerStatut(S(), demandeId, { statut: 'PRETE_A_SIGNER', montantReelCentimes: 1180000 })
    expect(vers('ca@t.fr').some(m => m.sujet.startsWith('Accord'))).toBe(true)
    expect(vers('assist@t.fr').some(m => m.sujet.startsWith('Accord'))).toBe(false)
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: demandeId } })).montantReelCentimes).toBe(1180000)
  })
  it('le commercial ne peut pas saisir le montant réel, ni envoyer en signature, ni mettre en place', async () => {
    await expect(dem.changerStatut(CA(), demandeId, { statut: 'REFUSEE', montantReelCentimes: 5 })).rejects.toThrow()
    await expect(dem.envoyerEnSignature(S(), demandeId, { prenom: 'a', nom: 'b', email: 'a@b.fr' }, { prenom: 'c', nom: 'd', email: 'c@d.fr' })).rejects.toThrow('signature électronique')
    await expect(dem.mettreEnPlaceContrat(CA(), demandeId, { montantReelCentimes: 1, banque: 'X', dateDebut: new Date() })).rejects.toThrow('Réservé')
  })
  it('mise en place : contrat créé avec montant réel, banque, 1er loyer et fin calculée ; dossier complet notifié', async () => {
    await expect(dem.mettreEnPlaceContrat(S(), demandeId, { montantReelCentimes: 1180000, banque: ' ', dateDebut: new Date('2026-12-01') })).rejects.toThrow('banque')
    await dem.mettreEnPlaceContrat(S(), demandeId, { montantReelCentimes: 1180000, banque: 'Locam', dateDebut: new Date('2026-12-01') })
    const c = await prisma.finContrat.findFirstOrThrow({ where: { demandeId } })
    expect(c).toMatchObject({ montantReelCentimes: 1180000, banque: 'Locam', dureeMois: 63, commercialId: ids.comA })
    expect(c.dateFin!.toISOString().slice(0, 7)).toBe('2032-03')
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: demandeId } })).statut).toBe('SIGNEE')
    expect(vers('ca@t.fr').some(m => m.sujet.startsWith('Dossier complet'))).toBe(true)
  })
  it('le commercial voit son contrat sans montant réel ni banque', async () => {
    const liste = await contrats.listerContrats(CA())
    expect(JSON.stringify(liste)).not.toMatch(/banque|montantReel|Locam|marge/)
    const vue = await acces.lireDemande(CA(), demandeId)
    expect(JSON.stringify(vue)).not.toMatch(/montantReel|marge/)
    const interne = (await contrats.listerContrats(S()))[0] as Record<string, unknown>
    expect(interne.banque).toBe('Locam')
  })

  it('signature électronique : client signé -> commercial + admin (par défaut) ; livraison -> commercial ; complet -> commercial + responsable choisi', async () => {
    const g = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    await admin.enregistrerGrille({ financeurId: g, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES))
    const { id } = await dem.creerDemande(CA(), entree({ financeurId: g }))
    await dem.changerStatut(CA(), id, { statut: 'ENVOYEE' })
    await dem.changerStatut(S(), id, { statut: 'PRETE_A_SIGNER' })
    await dem.envoyerEnSignature(CA(), id, { prenom: 'Jean', nom: 'Dupont', email: 'jean@acme.fr' }, { prenom: 'Mi', nom: 'Ka', email: 'boss@t.fr' })
    envoyes.length = 0
    await dem.changerEtapeSignature(S(), id, 'ATTENTE_LEVAD')
    expect(vers('ca@t.fr').some(m => m.sujet.startsWith('Le client a signé'))).toBe(true)
    expect(vers('boss@t.fr').some(m => m.sujet.startsWith('LEVAD doit signer'))).toBe(true) // administrateur par défaut
    await notif.ecrireParametre(notif.PARAM_SIGNATAIRE_LEVAD, String(ids.assistante))
    envoyes.length = 0
    await dem.changerEtapeSignature(A(), id, 'DEMARRAGE')
    await dem.changerEtapeSignature(CA(), id, 'ATTENTE_LEVAD')
    expect(vers('assist@t.fr').some(m => m.sujet.startsWith('LEVAD doit signer'))).toBe(true)
    expect(vers('boss@t.fr')).toHaveLength(0)
    envoyes.length = 0
    await dem.changerEtapeSignature(A(), id, 'ATTENTE_LIVRAISON')
    expect(vers('ca@t.fr').some(m => m.sujet.startsWith('Confirmation de livraison'))).toBe(true)
    await notif.ecrireParametre(notif.PARAM_DOSSIER_COMPLET, String(ids.assistante))
    envoyes.length = 0
    await dem.changerStatut(A(), id, { statut: 'SIGNEE' })
    expect(vers('ca@t.fr').some(m => m.sujet.startsWith('Dossier complet'))).toBe(true)
    expect(vers('assist@t.fr').some(m => m.sujet.startsWith('Dossier complet'))).toBe(true)
  })
  it('un échec d’envoi ne bloque jamais l’action et est journalisé', async () => {
    notif.remplacerExpediteur(async () => { throw new Error('boum') })
    const { id } = await dem.creerDemande(CA(), entree())
    await dem.changerStatut(CA(), id, { statut: 'ENVOYEE' })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).statut).toBe('ENVOYEE')
    expect(await prisma.finNotification.count({ where: { statut: 'ECHEC', erreur: 'boum' } })).toBeGreaterThan(0)
    notif.remplacerExpediteur(async m => { envoyes.push(m) })
  })

  it('transfert de portefeuille : contrats de X vers Y, montant commercial recalculé ; droits vérifiés', async () => {
    await expect(contrats.transfererContrats(S(), ids.comA, ids.comB)).rejects.toThrow('non autorisée')
    await expect(contrats.transfererContrats(A(), ids.comA, ids.comA)).rejects.toThrow('deux commerciaux')
    await expect(contrats.transfererContrats(A(), ids.comA, ids.assistante)).rejects.toThrow('actif')
    const avant = await prisma.finContrat.count({ where: { commercialId: ids.comA } })
    expect(avant).toBeGreaterThan(0)
    const r = await contrats.transfererContrats(A(), ids.comA, ids.comB)
    expect(r.transferes).toBe(avant)
    expect(await prisma.finContrat.count({ where: { commercialId: ids.comA } })).toBe(0)
    expect((await contrats.listerContrats({ id: ids.comA, role: 'COMMERCIAL' })).length).toBe(0)
    expect((await contrats.listerContrats({ id: ids.comB, role: 'COMMERCIAL' })).length).toBe(avant)
  })
})
