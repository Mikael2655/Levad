// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : base jetable, vidée par le test.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'
import type { EntreeDemande } from './demandes'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('demandes (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let dem: typeof import('./demandes')
  let acces: typeof import('./acces')
  let ids: { admin: number; assistante: number; comA: number; comB: number; grenke: number }
  const acteur = (id: number, role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL') => ({ id, role })
  const A = () => acteur(ids.admin, 'ADMIN')
  const S = () => acteur(ids.assistante, 'ASSISTANTE')
  const CA = () => acteur(ids.comA, 'COMMERCIAL')
  const CB = () => acteur(ids.comB, 'COMMERCIAL')

  const entree = (o: Partial<EntreeDemande> = {}): EntreeDemande => ({
    financeurId: ids.grenke, commercialId: null, raisonSociale: 'ACME SAS', siret: '35600000000048', formeJuridique: 'SAS',
    adresse: '6 rue du Port', codePostal: '67300', ville: 'Schiltigheim', pays: 'France',
    contactPrenom: 'Jean', contactNom: 'Dupont', contactEmail: 'jean@acme.fr', contactTel: null,
    dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300, montantCentimes: null,
    lignes: [{ designation: 'Copieur C3226i', quantite: 1, montantHtCentimes: null, typeBien: null, constructeur: 'Canon' }],
    ...o,
  })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    dem = await import('./demandes')
    acces = await import('./acces')
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
    ids = { admin: a, assistante: s, comA: ca, comB: cb, grenke }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  it('le commercial crée : montants recalculés par le serveur (exemple de Mikael), numéro LEV-AAAA-0001', async () => {
    const { id, reference } = await dem.creerDemande(CA(), entree())
    expect(reference).toBe(`LEV-${new Date().getFullYear()}-0001`)
    const brut = await prisma.finDemande.findUniqueOrThrow({ where: { id } })
    expect(brut).toMatchObject({ commercialId: ids.comA, saisiParId: ids.comA, statut: 'BROUILLON', loyerCentimes: 72300, montantCommercialCentimes: 1215126, montantReelCentimes: 1255208, coefficientCommercialPpm: 59500, coefficientReelPpm: 57600 })
    expect(await prisma.finHistorique.count({ where: { demandeId: id } })).toBe(1)
  })
  it('un corps de requête truqué ne change rien (montants, statut, commercial ignorés)', async () => {
    const e = dem.normaliserEntree({ ...entree(), montantReelCentimes: 1, montantCommercialCentimes: 1, statut: 'SIGNEE', saisiParId: 999, loyerCentimes: '72300' })
    expect(Object.keys(e)).not.toContain('statut')
    const { id } = await dem.creerDemande(CA(), e)
    expect(await prisma.finDemande.findUniqueOrThrow({ where: { id } })).toMatchObject({ statut: 'BROUILLON', saisiParId: ids.comA, montantCommercialCentimes: 1215126 })
  })
  it('saisie par le montant : le loyer s’en déduit', async () => {
    const { id } = await dem.creerDemande(CA(), entree({ loyerCentimes: null, montantCentimes: 1215126 }))
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).loyerCentimes).toBe(72300)
  })
  it('un commercial ne peut pas saisir pour un collègue ; l’assistante doit choisir le commercial', async () => {
    await expect(dem.creerDemande(CA(), entree({ commercialId: ids.comB }))).rejects.toThrow('pour vous-même')
    await expect(dem.creerDemande(S(), entree())).rejects.toThrow('Choisissez le commercial')
    const { id } = await dem.creerDemande(S(), entree({ commercialId: ids.comB }))
    expect(await prisma.finDemande.findUniqueOrThrow({ where: { id } })).toMatchObject({ commercialId: ids.comB, saisiParId: ids.assistante })
    await expect(dem.creerDemande(S(), entree({ commercialId: ids.assistante }))).rejects.toThrow('Commercial invalide')
    expect((await dem.creerDemande(A(), entree())).id).toBeGreaterThan(0) // l'admin saisit pour lui-même par défaut
  })
  it('le contact n’est pas demandé à la saisie ; il est enregistré à l’envoi en signature', async () => {
    const e = entree({ contactPrenom: '', contactNom: '', contactEmail: '', contactTel: null })
    const { id } = await dem.creerDemande(CA(), e)
    expect(await prisma.finDemande.findUniqueOrThrow({ where: { id } })).toMatchObject({ contactPrenom: '', contactNom: '', contactEmail: '' })
    await dem.changerStatut(CA(), id, { statut: 'ENVOYEE' })
    await dem.changerStatut(CA(), id, { statut: 'PRETE_A_SIGNER' })
    await dem.envoyerEnSignature(CA(), id, { prenom: 'Jeanne', nom: 'Martin', email: 'jeanne@acme.fr' }, { prenom: 'Marie', nom: 'D', email: 'm@levad.fr' })
    expect(await prisma.finDemande.findUniqueOrThrow({ where: { id } })).toMatchObject({ statut: 'EN_SIGNATURE', contactPrenom: 'Jeanne', contactNom: 'Martin', contactEmail: 'jeanne@acme.fr' })
  })
  it('étape de signature : démarre à « Démarrage », se précise à la main, s’efface quand le statut change, visible du commercial', async () => {
    const { id } = await dem.creerDemande(CA(), entree())
    await dem.changerStatut(CA(), id, { statut: 'ENVOYEE' })
    await dem.changerStatut(CA(), id, { statut: 'PRETE_A_SIGNER' })
    await expect(dem.changerEtapeSignature(CA(), id, 'ATTENTE_CLIENT')).rejects.toThrow('En signature')
    await dem.envoyerEnSignature(CA(), id, { prenom: 'J', nom: 'D', email: 'j@acme.fr' }, { prenom: 'M', nom: 'D', email: 'm@levad.fr' })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).etapeSignature).toBe('DEMARRAGE')
    await expect(dem.changerEtapeSignature(CA(), id, 'n_importe_quoi')).rejects.toThrow('inconnue')
    await expect(dem.changerEtapeSignature(CB(), id, 'ATTENTE_CLIENT')).rejects.toThrow('introuvable')
    await dem.changerEtapeSignature(CA(), id, 'ATTENTE_LEVAD')
    const fiche = await acces.lireDemande(CA(), id)
    expect(fiche).toMatchObject({ statut: 'EN_SIGNATURE', etapeSignature: 'ATTENTE_LEVAD' })
    expect(fiche!.historique.at(-1)!.commentaire).toBe('Signature : En attente de la signature de LEVAD')
    await dem.changerStatut(CA(), id, { statut: 'PRETE_A_SIGNER' }) // signature annulée : retour en arrière
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).etapeSignature).toBeNull()
  })
  it('un e-mail de contact, s’il est donné, doit rester valide', async () => {
    await expect(dem.creerDemande(CA(), entree({ contactEmail: 'pasunmail' }))).rejects.toThrow('e-mail du contact')
  })
  it('validations : SIRET à clé fausse refusé, SIRET vide accepté en brouillon, durée absente du barème refusée', async () => {
    await expect(dem.creerDemande(CA(), entree({ siret: '35600000100048' }))).rejects.toThrow('invalide')
    await expect(dem.creerDemande(CA(), entree({ dureeMois: 42 }))).rejects.toThrow('pas disponible')
    await expect(dem.creerDemande(CA(), entree({ lignes: [] }))).rejects.toThrow('au moins une ligne')
    expect((await dem.creerDemande(CA(), entree({ siret: '' }))).id).toBeGreaterThan(0)
  })
  it('barème propre : un autre barème donne un autre montant pour le même loyer', async () => {
    const m = lignesVersMatrice(COMMERCIAL_LIGNES)
    m.cellules[5] = [5.5, 5.4, 5.3] // 63 mois
    await admin.creerGrillePropre(ids.grenke, ids.comB)
    await admin.enregistrerGrille({ financeurId: ids.grenke, type: 'COMMERCIALE', utilisateurId: ids.comB }, 'TRIMESTRIEL', m)
    const { id } = await dem.creerDemande(CB(), entree())
    const brut = await prisma.finDemande.findUniqueOrThrow({ where: { id } })
    expect(brut.coefficientCommercialPpm).toBe(54000)
    expect(brut.montantCommercialCentimes).toBe(Math.round((72300 * 1_000_000) / 54000))
    expect(brut.montantReelCentimes).toBe(1255208) // le réel ne dépend pas du commercial
  })

  describe('statuts, signature, historique', () => {
    let id: number
    beforeAll(async () => { id = (await dem.creerDemande(CA(), entree({ siret: '' }))).id })

    it('envoi impossible sans SIREN valide ; un commercial ne touche pas au statut d’un collègue', async () => {
      await expect(dem.changerStatut(CB(), id, { statut: 'ENVOYEE' })).rejects.toThrow('introuvable')
      await expect(dem.changerStatut(CA(), id, { statut: 'ENVOYEE' })).rejects.toThrow('SIREN')
      await expect(dem.changerStatut(S(), id, { statut: 'ENVOYEE' })).rejects.toThrow('SIREN')
      await dem.modifierDemande(CA(), id, entree({ siret: '356 000 000 00048'.replace(/\s/g, '') }))
      await dem.changerStatut(S(), id, { statut: 'ENVOYEE', refFinanceur: 'GRK-123' })
      expect(await prisma.finDemande.findUniqueOrThrow({ where: { id } })).toMatchObject({ statut: 'ENVOYEE', refFinanceur: 'GRK-123' })
    })
    it('le commercial ne peut plus modifier après l’envoi ; l’admin si', async () => {
      await expect(dem.modifierDemande(CA(), id, entree())).rejects.toThrow('plus être modifiée')
      await expect(dem.modifierDemande(CB(), id, entree())).rejects.toThrow('introuvable')
      await expect(dem.modifierDemande(A(), id, entree({ commercialId: ids.comA }))).resolves.toBeTruthy()
    })
    it('informations manquantes : le texte est obligatoire, conservé, puis effacé au passage suivant', async () => {
      await expect(dem.changerStatut(S(), id, { statut: 'INFOS_MANQUANTES' })).rejects.toThrow('Indiquez')
      await dem.changerStatut(S(), id, { statut: 'INFOS_MANQUANTES', infosManquantes: 'Bilan 2025 et RIB' })
      expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).infosManquantes).toBe('Bilan 2025 et RIB')
      await dem.changerStatut(S(), id, { statut: 'PRETE_A_SIGNER' })
      expect((await prisma.finDemande.findUniqueOrThrow({ where: { id } })).infosManquantes).toBeNull()
    })
    it('« en signature » seulement par le formulaire des signataires, réservé à l’interne', async () => {
      await expect(dem.changerStatut(S(), id, { statut: 'EN_SIGNATURE' })).rejects.toThrow('pas possible')
      const client = { prenom: 'Jean', nom: 'Dupont', email: 'jean@acme.fr' }
      const moi = { prenom: 'Mikael', nom: 'B', email: 'm@levad.fr' }
      await expect(dem.envoyerEnSignature(CB(), id, client, moi)).rejects.toThrow('introuvable')
      await expect(dem.envoyerEnSignature(S(), id, { ...client, email: 'pasunmail' }, moi)).rejects.toThrow('valides')
      await dem.envoyerEnSignature(CA(), id, client, moi) // le commercial de la demande peut lancer la signature
      expect(await prisma.finDemande.findUniqueOrThrow({ where: { id }, include: { signature: true } })).toMatchObject({ statut: 'EN_SIGNATURE', signature: { clientEmail: 'jean@acme.fr', fournisseurEmail: 'm@levad.fr' } })
      await dem.changerStatut(S(), id, { statut: 'SIGNEE' })
    })
    it('l’historique garde chaque changement avec son auteur, sans exposer d’adresse e-mail', async () => {
      const fiche = await acces.lireDemande(CA(), id)
      expect(fiche!.historique.map(h => h.nouveauStatut)).toEqual(['BROUILLON', 'BROUILLON', 'ENVOYEE', 'ENVOYEE', 'INFOS_MANQUANTES', 'PRETE_A_SIGNER', 'EN_SIGNATURE', 'SIGNEE'])
      expect(fiche!.historique[4].commentaire).toContain('Bilan 2025 et RIB')
      const json = JSON.stringify(fiche)
      for (const interdit of ['Reel', 'marge', '1255208', 'GRK-123', 'assist@t.fr', 'boss@t.fr', 'ca@t.fr']) expect(json).not.toContain(interdit)
    })
    it('un commercial mène sa demande seul, de la saisie à la signature ; le n° de dossier financeur lui reste caché', async () => {
      const x = (await dem.creerDemande(CA(), entree())).id
      await dem.changerStatut(CA(), x, { statut: 'ENVOYEE', refFinanceur: 'TENTATIVE' })
      await dem.changerStatut(CA(), x, { statut: 'PRETE_A_SIGNER' })
      await dem.envoyerEnSignature(CA(), x, { prenom: 'J', nom: 'D', email: 'j@acme.fr' }, { prenom: 'M', nom: 'D', email: 'm@levad.fr' })
      await dem.changerStatut(CA(), x, { statut: 'SIGNEE' })
      const brut = await prisma.finDemande.findUniqueOrThrow({ where: { id: x } })
      expect(brut.statut).toBe('SIGNEE')
      expect(brut.refFinanceur).toBeNull() // seul l'interne renseigne cette donnée réelle
    })
    it('annulation : le commercial son brouillon, pas l’assistante', async () => {
      const b = (await dem.creerDemande(CA(), entree())).id
      await expect(dem.changerStatut(S(), b, { statut: 'ANNULEE' })).rejects.toThrow('pas possible')
      await expect(dem.changerStatut(CB(), b, { statut: 'ANNULEE' })).rejects.toThrow('introuvable')
      await dem.changerStatut(CA(), b, { statut: 'ANNULEE' })
      expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: b } })).statut).toBe('ANNULEE')
    })
  })

  describe('archivage, tableau de bord, suppression', () => {
    it('archiver masque la demande ; un autre commercial ne peut pas ; compteurs et filtres', async () => {
      const x = (await dem.creerDemande(CA(), entree())).id
      await expect(dem.archiverDemande(CB(), x, true)).rejects.toThrow('introuvable')
      const avant = (await acces.listerDemandes(CA())).length
      await dem.archiverDemande(CA(), x, true)
      expect((await acces.listerDemandes(CA())).length).toBe(avant - 1)
      expect((await acces.listerDemandes(CA(), { archivees: true })).map(r => r.id)).toContain(x)
      await dem.archiverDemande(S(), x, false)
      const compteurs = await acces.compterParStatut(CA())
      expect(compteurs.BROUILLON).toBeGreaterThan(0)
      const tout = await acces.compterParStatut(S())
      expect(Object.values(tout).reduce((n, v) => n + v, 0)).toBeGreaterThan(Object.values(compteurs).reduce((n, v) => n + v, 0))
      const liste = await acces.listerDemandes(S(), { commercialId: ids.comB })
      expect(liste.every(r => r.commercialId === ids.comB)).toBe(true)
      expect(liste[0].commercialNom).toBeTruthy()
    })
    it('seul l’admin supprime', async () => {
      const x = (await dem.creerDemande(CA(), entree())).id
      await expect(dem.supprimerDemande(S(), x)).rejects.toThrow('administrateur')
      await expect(dem.supprimerDemande(CA(), x)).rejects.toThrow('administrateur')
      await dem.supprimerDemande(A(), x)
      expect(await prisma.finDemande.findUnique({ where: { id: x } })).toBeNull()
    })
  })

  it('aperçu du calcul : le commercial ne reçoit jamais le réel ni la marge', async () => {
    const { vueCalcul } = await import('./droits')
    const c = await dem.calculer({ financeurId: ids.grenke, commercialId: ids.comA, dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300, montantCentimes: null })
    const json = JSON.stringify(vueCalcul(CA(), c))
    for (const interdit of ['reel', 'marge', '1255208', '57600']) expect(json).not.toContain(interdit)
    expect(json).toContain('1215126')
    expect(JSON.stringify(vueCalcul(S(), c))).toContain('1255208')
    expect(c.dureesDisponibles).toEqual([36, 48, 60, 63])
  })
})
