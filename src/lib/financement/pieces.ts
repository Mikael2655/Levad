// Pièces jointes d'une demande (Kbis, bilans, RIB...) : rangées dans la base de données, découpées en morceaux de 3 Mo
// (une requête ne peut pas dépasser 4,5 Mo chez l'hébergeur). Accès : ceux qui voient la demande. Suppression automatique
// 60 jours après le dépôt pour que la base ne se remplisse jamais.
import { prisma } from '@/lib/db'
import type { Connecteur } from './connecteurs/connecteur'
import { connecteurPour } from './connecteurs'
import { estInterne, type Acteur } from './droits'
import { ErreurMetier } from './erreurs'

export const TAILLE_MAX = 10 * 1024 * 1024
export const MORCEAU_MAX = 3 * 1024 * 1024
export const MAX_PIECES = 20
export const CONSERVATION_JOURS = 60

export const TYPES_PIECE = ['KBIS', 'BILAN', 'RIB', 'IDENTITE', 'AUTRE'] as const
export type TypePiece = (typeof TYPES_PIECE)[number]
export const LIBELLES_PIECE: Record<TypePiece, string> = { KBIS: 'Kbis', BILAN: 'Bilan', RIB: 'RIB', IDENTITE: 'Pièce d’identité', AUTRE: 'Autre' }

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
export const EXTENSIONS_ACCEPTEES = Object.keys(MIME)

// Début du contenu attendu pour chaque extension : un fichier renommé (ex. .exe en .pdf) est refusé.
const SIGNATURES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  docx: [[0x50, 0x4b]],
  xlsx: [[0x50, 0x4b]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0]],
  xls: [[0xd0, 0xcf, 0x11, 0xe0]],
}

const extension = (nom: string) => (nom.split('.').length > 1 ? nom.split('.').pop()!.toLowerCase() : '')
export const typeMimePour = (nom: string) => MIME[extension(nom)] ?? 'application/octet-stream'

export function nomSur(nom: string): string {
  return nom.replace(/[\\/]/g, '_').replace(/[\u0000-\u001f"<>|:*?]/g, '').trim().slice(0, 150)
}

export const suppressionLe = (ajouteLe: Date) => new Date(ajouteLe.getTime() + CONSERVATION_JOURS * 86_400_000)

async function demandeAccessible(a: Acteur, id: number) {
  const d = await prisma.finDemande.findFirst({ where: { id, ...(estInterne(a) ? {} : { commercialId: a.id }) } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  return d
}

async function pieceAccessible(a: Acteur, pieceId: number) {
  const p = await prisma.finPieceJointe.findUnique({ where: { id: pieceId }, include: { demande: true } })
  if (!p || (!estInterne(a) && p.demande.commercialId !== a.id)) throw new ErreurMetier('Pièce introuvable.', 404)
  return p
}

const modifiable = (statut: string) => statut !== 'ANNULEE' && statut !== 'SIGNEE'

export async function commencerPiece(a: Acteur, demandeId: number, p: { type: string; nomFichier: string; taille: number }) {
  await purgeOpportuniste()
  const d = await demandeAccessible(a, demandeId)
  if (!modifiable(d.statut)) throw new ErreurMetier('On ne peut plus ajouter de pièce à cette demande.', 403)
  if (!(TYPES_PIECE as readonly string[]).includes(p.type)) throw new ErreurMetier('Choisissez le type de pièce.')
  const nom = nomSur(p.nomFichier)
  if (!nom) throw new ErreurMetier('Nom de fichier invalide.')
  if (!EXTENSIONS_ACCEPTEES.includes(extension(nom))) throw new ErreurMetier(`Format non accepté. Formats possibles : ${EXTENSIONS_ACCEPTEES.join(', ')}.`)
  if (!Number.isInteger(p.taille) || p.taille <= 0) throw new ErreurMetier('Le fichier est vide.')
  if (p.taille > TAILLE_MAX) throw new ErreurMetier('Fichier trop volumineux (10 Mo maximum).')
  if ((await prisma.finPieceJointe.count({ where: { demandeId } })) >= MAX_PIECES) throw new ErreurMetier(`${MAX_PIECES} pièces au maximum par demande.`)
  const piece = await prisma.finPieceJointe.create({ data: { demandeId, type: p.type, nomFichier: nom, taille: p.taille, typeMime: typeMimePour(nom), ajouteParId: a.id } })
  return { id: piece.id }
}

export async function ajouterMorceau(a: Acteur, pieceId: number, ordre: number, donnees: Buffer) {
  const p = await pieceAccessible(a, pieceId)
  if (p.complete || p.ajouteParId !== a.id) throw new ErreurMetier('Envoi impossible pour cette pièce.', 403)
  if (!Number.isInteger(ordre) || ordre < 0 || ordre > Math.ceil(TAILLE_MAX / MORCEAU_MAX)) throw new ErreurMetier('Morceau invalide.')
  if (donnees.length === 0 || donnees.length > MORCEAU_MAX) throw new ErreurMetier('Morceau invalide.')
  if (ordre === 0) {
    const signatures = SIGNATURES[extension(p.nomFichier)] ?? []
    if (!signatures.some(s => s.every((o, i) => donnees[i] === o))) throw new ErreurMetier('Le contenu du fichier ne correspond pas à son format.')
  }
  const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`SELECT COALESCE(SUM(octet_length("donnees")), 0) AS total FROM "fin_piece_morceau" WHERE "pieceId" = ${pieceId}`
  if (Number(total) + donnees.length > p.taille) throw new ErreurMetier('Le fichier reçu dépasse la taille annoncée.')
  await prisma.finPieceMorceau.create({ data: { pieceId, ordre, donnees: new Uint8Array(donnees) } })
  return { ok: true }
}

export async function terminerPiece(a: Acteur, pieceId: number) {
  const p = await pieceAccessible(a, pieceId)
  if (p.complete || p.ajouteParId !== a.id) throw new ErreurMetier('Envoi impossible pour cette pièce.', 403)
  const morceaux = await prisma.$queryRaw<{ ordre: number; octets: number }[]>`SELECT "ordre", octet_length("donnees") AS octets FROM "fin_piece_morceau" WHERE "pieceId" = ${pieceId} ORDER BY "ordre"`
  const total = morceaux.reduce((n, m) => n + Number(m.octets), 0)
  const contigus = morceaux.every((m, i) => m.ordre === i)
  if (!contigus || total !== p.taille) {
    await prisma.finPieceJointe.delete({ where: { id: pieceId } })
    throw new ErreurMetier('L’envoi du fichier est incomplet : recommencez.')
  }
  await prisma.$transaction([
    prisma.finPieceJointe.update({ where: { id: pieceId }, data: { complete: true } }),
    prisma.finHistorique.create({ data: { demandeId: p.demandeId, auteurId: a.id, ancienStatut: p.demande.statut, nouveauStatut: p.demande.statut, commentaire: `Pièce jointe ajoutée : ${p.nomFichier} (${LIBELLES_PIECE[p.type as TypePiece] ?? p.type})` } }),
  ])
  await transmettrePieces(p.demandeId) // financeur avec API (Grenke) : la pièce part directement chez lui, si la demande existe déjà là-bas
  return { ok: true }
}

// Envoie au financeur, par son API, les pièces pas encore transmises. Ne fait rien pour un financeur sans API, ni tant que la
// demande n'existe pas chez lui (pas de référence). Ne lève jamais d'erreur : un échec laisse la pièce « à envoyer » et se retente
// au prochain appel (nouvelle pièce, ou création de la demande chez le financeur).
export async function transmettrePieces(demandeId: number, connecteur?: Connecteur | null): Promise<{ envoyees: number; echecs: string[] }> {
  const resultat = { envoyees: 0, echecs: [] as string[] }
  try {
    const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, include: { financeur: true } })
    const c = connecteur === undefined ? connecteurPour(d?.financeur.connecteur ?? '') : connecteur
    if (!d || !c || !d.refFinanceur) return resultat
    const pieces = await prisma.finPieceJointe.findMany({ where: { demandeId, complete: true, envoyeFinanceurLe: null }, orderBy: { id: 'asc' } })
    for (const piece of pieces) {
      try {
        const morceaux = await prisma.finPieceMorceau.findMany({ where: { pieceId: piece.id }, orderBy: { ordre: 'asc' } })
        await c.envoyerPiece(d.refFinanceur, piece.nomFichier, Buffer.concat(morceaux.map(m => Buffer.from(m.donnees))))
        await prisma.finPieceJointe.update({ where: { id: piece.id }, data: { envoyeFinanceurLe: new Date() } })
        resultat.envoyees++
      } catch (e) {
        resultat.echecs.push(`${piece.nomFichier} : ${(e as Error).message}`)
      }
    }
  } catch (e) {
    resultat.echecs.push((e as Error).message)
  }
  if (resultat.echecs.length) console.error('Envoi des pièces au financeur : échecs', resultat.echecs)
  return resultat
}

// Lecture : morceaux envoyés un par un (jamais tout le fichier en mémoire).
export async function lirePiece(a: Acteur, pieceId: number) {
  const p = await pieceAccessible(a, pieceId)
  if (!p.complete) throw new ErreurMetier('Pièce introuvable.', 404)
  async function* flux() {
    const ids = await prisma.finPieceMorceau.findMany({ where: { pieceId }, orderBy: { ordre: 'asc' }, select: { id: true } })
    for (const { id } of ids) {
      const m = await prisma.finPieceMorceau.findUnique({ where: { id } })
      if (m) yield Buffer.from(m.donnees)
    }
  }
  return { nomFichier: p.nomFichier, typeMime: p.typeMime, taille: p.taille, flux: flux() }
}

export async function supprimerPiece(a: Acteur, pieceId: number) {
  const p = await pieceAccessible(a, pieceId)
  // le commercial retire ses propres pièces ; l'administrateur et l'assistante, toutes
  if (!estInterne(a) && p.ajouteParId !== a.id) throw new ErreurMetier('Action non autorisée.', 403)
  if (!modifiable(p.demande.statut)) throw new ErreurMetier('On ne peut plus modifier les pièces de cette demande.', 403)
  await prisma.$transaction([
    prisma.finPieceJointe.delete({ where: { id: pieceId } }),
    ...(p.complete ? [prisma.finHistorique.create({ data: { demandeId: p.demandeId, auteurId: a.id, ancienStatut: p.demande.statut, nouveauStatut: p.demande.statut, commentaire: `Pièce jointe supprimée : ${p.nomFichier}` } })] : []),
  ])
  return { ok: true }
}

// --- Suppression automatique -------------------------------------------------------------------------------------------

export async function purgerPieces(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - CONSERVATION_JOURS * 86_400_000)
  const incompletes = new Date(maintenant.getTime() - 86_400_000) // envoi abandonné depuis plus d'un jour
  const r = await prisma.finPieceJointe.deleteMany({ where: { OR: [{ complete: true, ajouteLe: { lt: limite } }, { complete: false, ajouteLe: { lt: incompletes } }] } })
  return r.count
}

// L'hébergeur ne lance pas toujours les tâches planifiées : le nettoyage se fait aussi, au plus toutes les 12 heures,
// quand quelqu'un ajoute ou consulte des pièces.
export async function purgeOpportuniste(maintenant: Date = new Date()): Promise<void> {
  try {
    const cle = 'pieces.purgeLe'
    const dernier = await prisma.finParametre.findUnique({ where: { cle } })
    if (dernier && maintenant.getTime() - new Date(dernier.valeur).getTime() < 12 * 3_600_000) return
    await prisma.finParametre.upsert({ where: { cle }, create: { cle, valeur: maintenant.toISOString() }, update: { valeur: maintenant.toISOString() } })
    await purgerPieces(maintenant)
  } catch (e) {
    console.error('Nettoyage des pièces jointes : erreur ignorée', e)
  }
}
