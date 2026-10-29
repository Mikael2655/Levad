// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : pièces jointes rangées dans la base.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'
import type { EntreeDemande } from './demandes'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('pièces jointes (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let dem: typeof import('./demandes')
  let acces: typeof import('./acces')
  let pj: typeof import('./pieces')
  let ids: { admin: number; assistante: number; comA: number; comB: number; grenke: number }
  let demandeId: number
  const acteur = (id: number, role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL') => ({ id, role })
  const A = () => acteur(ids.admin, 'ADMIN')
  const S = () => acteur(ids.assistante, 'ASSISTANTE')
  const CA = () => acteur(ids.comA, 'COMMERCIAL')
  const CB = () => acteur(ids.comB, 'COMMERCIAL')
  const pdf = (octets: number) => { const b = Buffer.alloc(octets, 0x41); b.write('%PDF-1.4', 0); return b }

  const entree = (): EntreeDemande => ({
    financeurId: ids.grenke, commercialId: null, raisonSociale: 'ACME SAS', siret: '35600000000048', formeJuridique: 'SAS',
    adresse: '6 rue du Port', codePostal: '67300', ville: 'Schiltigheim', pays: 'France',
    contactPrenom: 'Jean', contactNom: 'Dupont', contactEmail: 'jean@acme.fr', contactTel: null,
    dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300, montantCentimes: null,
    lignes: [{ designation: 'Copieur', quantite: 1, montantHtCentimes: null, typeBien: null, constructeur: 'Canon' }],
  })

  // Envoi complet comme le fait le navigateur : annonce, morceaux de 3 Mo, fin.
  async function deposer(a: ReturnType<typeof CA>, contenu: Buffer, nom = 'kbis.pdf', type = 'KBIS') {
    const { id } = await pj.commencerPiece(a, demandeId, { type, nomFichier: nom, taille: contenu.length })
    for (let i = 0; i * pj.MORCEAU_MAX < contenu.length; i++) await pj.ajouterMorceau(a, id, i, contenu.subarray(i * pj.MORCEAU_MAX, (i + 1) * pj.MORCEAU_MAX))
    await pj.terminerPiece(a, id)
    return id
  }
  async function lire(a: ReturnType<typeof CA>, id: number) {
    const p = await pj.lirePiece(a, id)
    const parts: Buffer[] = []
    for await (const m of p.flux) parts.push(m)
    return { ...p, contenu: Buffer.concat(parts) }
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    dem = await import('./demandes')
    acces = await import('./acces')
    pj = await import('./pieces')
    await prisma.finPieceJointe.deleteMany()
    await prisma.finParametre.deleteMany()
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
    demandeId = (await dem.creerDemande(CA(), entree())).id
  })
  afterAll(async () => { await prisma?.$disconnect() })

  it('dépôt d’un petit fichier puis téléchargement identique', async () => {
    const contenu = pdf(2000)
    const id = await deposer(CA(), contenu)
    const l = await lire(CA(), id)
    expect(l.contenu.equals(contenu)).toBe(true)
    expect(l).toMatchObject({ nomFichier: 'kbis.pdf', typeMime: 'application/pdf', taille: 2000 })
  })
  it('un fichier de 10 Mo est découpé en morceaux de 3 Mo et reconstitué à l’identique', async () => {
    const contenu = pdf(10 * 1024 * 1024)
    const id = await deposer(CA(), contenu, 'bilan.pdf', 'BILAN')
    expect(await prisma.finPieceMorceau.count({ where: { pieceId: id } })).toBe(4)
    expect((await lire(S(), id)).contenu.equals(contenu)).toBe(true)
  })
  it('refus : trop gros, vide, format inconnu, contenu truqué, type inconnu', async () => {
    await expect(pj.commencerPiece(CA(), demandeId, { type: 'KBIS', nomFichier: 'a.pdf', taille: 10 * 1024 * 1024 + 1 })).rejects.toThrow('10 Mo')
    await expect(pj.commencerPiece(CA(), demandeId, { type: 'KBIS', nomFichier: 'a.pdf', taille: 0 })).rejects.toThrow('vide')
    await expect(pj.commencerPiece(CA(), demandeId, { type: 'KBIS', nomFichier: 'virus.exe', taille: 10 })).rejects.toThrow('Format non accepté')
    await expect(pj.commencerPiece(CA(), demandeId, { type: 'AUTRE2', nomFichier: 'a.pdf', taille: 10 })).rejects.toThrow('type de pièce')
    const { id } = await pj.commencerPiece(CA(), demandeId, { type: 'KBIS', nomFichier: 'faux.pdf', taille: 100 })
    await expect(pj.ajouterMorceau(CA(), id, 0, Buffer.alloc(100, 0x4d))).rejects.toThrow('ne correspond pas')
    await prisma.finPieceJointe.delete({ where: { id } })
  })
  it('un fichier incomplet ou plus gros qu’annoncé est refusé', async () => {
    const a = await pj.commencerPiece(CA(), demandeId, { type: 'KBIS', nomFichier: 'a.pdf', taille: 5000 })
    await pj.ajouterMorceau(CA(), a.id, 0, pdf(3000))
    await expect(pj.terminerPiece(CA(), a.id)).rejects.toThrow('incomplet')
    expect(await prisma.finPieceJointe.count({ where: { id: a.id } })).toBe(0)
    const b = await pj.commencerPiece(CA(), demandeId, { type: 'KBIS', nomFichier: 'b.pdf', taille: 100 })
    await expect(pj.ajouterMorceau(CA(), b.id, 0, pdf(200))).rejects.toThrow('dépasse')
  })
  it('un nom de fichier piégé est assaini', async () => {
    const id = await deposer(CA(), pdf(100), '../../etc/pass"wd<1>.pdf')
    expect((await prisma.finPieceJointe.findUniqueOrThrow({ where: { id } })).nomFichier).toBe('.._.._etc_passwd1.pdf')
  })

  it('accès : un autre commercial ne voit, ne télécharge, ne dépose, ne supprime rien', async () => {
    const id = await deposer(CA(), pdf(300), 'secret.pdf')
    await expect(pj.lirePiece(CB(), id)).rejects.toThrow('introuvable')
    await expect(pj.supprimerPiece(CB(), id)).rejects.toThrow('introuvable')
    await expect(pj.commencerPiece(CB(), demandeId, { type: 'KBIS', nomFichier: 'a.pdf', taille: 10 })).rejects.toThrow('introuvable')
    expect(JSON.stringify(await acces.lireDemande(CB(), demandeId))).toBe('null')
    const fiche = await acces.lireDemande(CA(), demandeId)
    expect(fiche!.pieces.some(p => p.id === id)).toBe(true)
    expect(JSON.stringify(fiche)).not.toContain('donnees')
  })
  it('le dépôt en cours n’apparaît pas dans la fiche ; un autre utilisateur ne peut pas y ajouter de morceau', async () => {
    const { id } = await pj.commencerPiece(CA(), demandeId, { type: 'RIB', nomFichier: 'rib.pdf', taille: 500 })
    expect((await acces.lireDemande(CA(), demandeId))!.pieces.some(p => p.id === id)).toBe(false)
    await expect(pj.ajouterMorceau(S(), id, 0, pdf(500))).rejects.toThrow('Envoi impossible')
    await expect(pj.lirePiece(CA(), id)).rejects.toThrow('introuvable')
    await prisma.finPieceJointe.delete({ where: { id } })
  })
  it('suppression : le commercial retire les siennes, l’assistante et l’admin toutes ; l’historique garde la trace', async () => {
    const parCom = await deposer(CA(), pdf(100), 'a.pdf')
    const parAssistante = await deposer(S(), pdf(100), 'b.pdf')
    await expect(pj.supprimerPiece(CA(), parAssistante)).rejects.toThrow('non autorisée')
    await pj.supprimerPiece(CA(), parCom)
    await pj.supprimerPiece(A(), parAssistante)
    const h = await prisma.finHistorique.findMany({ where: { demandeId }, orderBy: { id: 'asc' } })
    expect(h.some(x => x.commentaire?.includes('Pièce jointe ajoutée : a.pdf'))).toBe(true)
    expect(h.some(x => x.commentaire?.includes('Pièce jointe supprimée : b.pdf'))).toBe(true)
    expect(await prisma.finPieceMorceau.count({ where: { pieceId: parCom } })).toBe(0)
  })
  it('on ne peut plus ajouter de pièce à une demande annulée', async () => {
    const { id } = await dem.creerDemande(CA(), entree())
    await dem.changerStatut(CA(), id, { statut: 'ANNULEE' })
    await expect(pj.commencerPiece(CA(), id, { type: 'KBIS', nomFichier: 'a.pdf', taille: 10 })).rejects.toThrow('plus ajouter')
  })

  it('suppression automatique à 60 jours (et des envois abandonnés depuis plus d’un jour)', async () => {
    const vieille = await deposer(CA(), pdf(100), 'vieille.pdf')
    const recente = await deposer(CA(), pdf(100), 'recente.pdf')
    const abandonnee = (await pj.commencerPiece(CA(), demandeId, { type: 'KBIS', nomFichier: 'abandon.pdf', taille: 10 })).id
    const il_y_a = (j: number) => new Date(Date.now() - j * 86_400_000)
    await prisma.finPieceJointe.update({ where: { id: vieille }, data: { ajouteLe: il_y_a(61) } })
    await prisma.finPieceJointe.update({ where: { id: recente }, data: { ajouteLe: il_y_a(59) } })
    await prisma.finPieceJointe.update({ where: { id: abandonnee }, data: { ajouteLe: il_y_a(2) } })
    const nb = await pj.purgerPieces()
    expect(nb).toBeGreaterThanOrEqual(2)
    expect(await prisma.finPieceJointe.count({ where: { id: { in: [vieille, abandonnee] } } })).toBe(0)
    expect(await prisma.finPieceJointe.count({ where: { id: recente } })).toBe(1)
    expect(await prisma.finPieceMorceau.count({ where: { pieceId: vieille } })).toBe(0)
  })
  it('le nettoyage opportuniste ne tourne qu’une fois toutes les 12 heures', async () => {
    await prisma.finParametre.deleteMany({ where: { cle: 'pieces.purgeLe' } })
    const vieille = await deposer(CA(), pdf(100), 'v2.pdf')
    await prisma.finPieceJointe.update({ where: { id: vieille }, data: { ajouteLe: new Date(Date.now() - 70 * 86_400_000) } })
    await prisma.finParametre.deleteMany({ where: { cle: 'pieces.purgeLe' } }) // (le dépôt ci-dessus a déjà déclenché un nettoyage)
    await pj.purgeOpportuniste()
    expect(await prisma.finPieceJointe.count({ where: { id: vieille } })).toBe(0)
    const autre = await deposer(CA(), pdf(100), 'v3.pdf')
    await prisma.finPieceJointe.update({ where: { id: autre }, data: { ajouteLe: new Date(Date.now() - 70 * 86_400_000) } })
    await pj.purgeOpportuniste() // trop tôt : rien
    expect(await prisma.finPieceJointe.count({ where: { id: autre } })).toBe(1)
    expect(pj.suppressionLe(new Date('2026-01-01T00:00:00Z')).toISOString().slice(0, 10)).toBe('2026-03-02')
  })

  describe('envoi au financeur par son API', () => {
    const envoyes: { ref: string; nom: string; octets: number }[] = []
    const faux = (echoue = false) => ({ envoyerPiece: async (ref: string, nom: string, contenu: Buffer) => { if (echoue) throw new Error('Grenke indisponible'); envoyes.push({ ref, nom, octets: contenu.length }) } }) as never
    it('sans référence chez le financeur ou sans connecteur : rien ne part', async () => {
      const id = await deposer(CA(), pdf(500), 'avant.pdf')
      expect(await pj.transmettrePieces(demandeId, faux())).toEqual({ envoyees: 0, echecs: [] }) // demande pas encore créée chez le financeur
      await prisma.finDemande.update({ where: { id: demandeId }, data: { refFinanceur: '11111111-1111-1111-1111-111111111111' } })
      expect(await pj.transmettrePieces(demandeId, null)).toEqual({ envoyees: 0, echecs: [] }) // financeur sans API
      expect((await prisma.finPieceJointe.findUniqueOrThrow({ where: { id } })).envoyeFinanceurLe).toBeNull()
    })
    it('avec la référence : toutes les pièces en attente partent, une seule fois, avec leur contenu complet', async () => {
      const gros = pdf(7 * 1024 * 1024)
      await prisma.finPieceJointe.updateMany({ where: { demandeId }, data: { envoyeFinanceurLe: new Date() } }) // anciennes pièces déjà parties
      const id = await deposer(CA(), gros, 'gros.pdf')
      envoyes.length = 0
      expect(await pj.transmettrePieces(demandeId, faux())).toEqual({ envoyees: 1, echecs: [] })
      expect(envoyes).toEqual([{ ref: '11111111-1111-1111-1111-111111111111', nom: 'gros.pdf', octets: gros.length }])
      expect((await prisma.finPieceJointe.findUniqueOrThrow({ where: { id } })).envoyeFinanceurLe).not.toBeNull()
      expect(await pj.transmettrePieces(demandeId, faux())).toEqual({ envoyees: 0, echecs: [] }) // pas de doublon
    })
    it('un échec laisse la pièce « à envoyer », sans bloquer le dépôt, et se retente ensuite', async () => {
      await prisma.finPieceJointe.updateMany({ where: { demandeId }, data: { envoyeFinanceurLe: new Date() } })
      const id = await deposer(CA(), pdf(300), 'echec.pdf')
      const r = await pj.transmettrePieces(demandeId, faux(true))
      expect(r.envoyees).toBe(0)
      expect(r.echecs[0]).toContain('Grenke indisponible')
      expect((await prisma.finPieceJointe.findUniqueOrThrow({ where: { id } })).envoyeFinanceurLe).toBeNull()
      expect((await pj.transmettrePieces(demandeId, faux())).envoyees).toBe(1)
    })
  })
})
