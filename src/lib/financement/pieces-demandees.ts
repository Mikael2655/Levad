// Pièces demandées par le financeur : le détail arrive par e-mail (PDF). On en extrait la liste des pièces à fournir
// pour que les commerciaux la voient directement sur la demande, sans qu'on ait à leur dire.
// L'extraction repose sur des mots-clés (Kbis, bilan, RIB...) : le résultat est toujours relu et corrigeable avant d'être enregistré.
import { prisma } from '@/lib/db'
import { estInterne, type Acteur } from './droits'
import { ErreurMetier } from './erreurs'
import { notifierChangement } from './notifications'

export type TypePieceDemandee = 'KBIS' | 'BILAN' | 'RIB' | 'AUTRE'

interface Regle { motif: RegExp; libelle: string; type: TypePieceDemandee }
// Ordre = ordre d'affichage. Le texte est comparé en minuscules, sans accents.
const REGLES: Regle[] = [
  { motif: /\bk\s?-?bis\b|extrait d.?immatriculation|extrait k/, libelle: 'Extrait Kbis', type: 'KBIS' },
  { motif: /\bbilans?\b|comptes? annuels?|liasse fiscale|compte de resultat/, libelle: 'Bilan / comptes annuels', type: 'BILAN' },
  { motif: /\brib\b|\biban\b|releve d.?identite bancaire/, libelle: 'RIB', type: 'RIB' },
  { motif: /piece d.?identite|\bcni\b|carte (nationale )?d.?identite|passeport|titre de sejour/, libelle: 'Pièce d’identité du dirigeant', type: 'AUTRE' },
  { motif: /\bstatuts\b/, libelle: 'Statuts de la société', type: 'AUTRE' },
  { motif: /avis d.?imposition|declaration (de revenus|d.?impot)/, libelle: 'Avis d’imposition', type: 'AUTRE' },
  { motif: /releves? bancaires?|releves? de compte/, libelle: 'Relevés bancaires', type: 'AUTRE' },
  { motif: /justificatif de domicile|quittance|facture (d.?)?(eau|electricite|gaz|telephone)/, libelle: 'Justificatif de domicile', type: 'AUTRE' },
  { motif: /\bbail\b|contrat de location/, libelle: 'Bail', type: 'AUTRE' },
  { motif: /mandat sepa|autorisation de prelevement/, libelle: 'Mandat SEPA signé', type: 'AUTRE' },
  { motif: /attestation (de vigilance|urssaf|fiscale|de regularite)/, libelle: 'Attestation de vigilance / régularité', type: 'AUTRE' },
  { motif: /situation (comptable|intermediaire)|bilan previsionnel|business plan|previsionnel/, libelle: 'Situation comptable / prévisionnel', type: 'BILAN' },
  { motif: /caution|garantie (personnelle|bancaire)|garant\b/, libelle: 'Garantie / caution', type: 'AUTRE' },
]

const sansAccents = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const nettoyer = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s•\-–—*·▪■□☐✓✔]+/, '').replace(/^\d{1,2}\s?[.)]\s+/, '').trim() // retire puces et numérotation « 1. », garde « 3 derniers bilans »

export interface PiecesExtraites { lignes: string[]; types: TypePieceDemandee[] }

// Découpe le texte en phrases / puces, garde celles qui parlent d'une pièce connue (en reprenant la phrase d'origine, qui porte
// souvent la précision utile : « 3 derniers bilans », « de moins de 3 mois »...). Une pièce n'apparaît qu'une fois.
export function extrairePiecesDemandees(texte: string): PiecesExtraites {
  const morceaux = texte.split(/\r?\n|(?<=[.;:!?])\s+(?=[A-ZÀ-Ý•\-–])|•|▪|■|☐/).map(nettoyer).filter(m => m.length >= 3)
  const lignes: string[] = []
  const types = new Set<TypePieceDemandee>()
  for (const r of REGLES) {
    const candidats = morceaux.filter(m => r.motif.test(sansAccents(m)) && m.length <= 220).sort((x, y) => x.length - y.length)
    if (candidats.length === 0) continue
    const phrase = candidats[0] // la plus courte : la plus précise (« Un extrait K-bis de moins de 3 mois »)
    lignes.push(phrase.length <= 150 ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : r.libelle)
    types.add(r.type)
  }
  return { lignes, types: Array.from(types) }
}

// Ligne -> type de pièce jointe de l'outil (pour cocher ce qui a déjà été déposé).
export function typeDeLigne(ligne: string): TypePieceDemandee {
  const t = sansAccents(ligne)
  for (const r of REGLES) if (r.motif.test(t)) return r.type
  return 'AUTRE'
}

export async function extraireTextePdf(contenu: Buffer): Promise<string> {
  const { getDocumentProxy, extractText } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(contenu))
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join('\n') : text
}

export async function analyserPdfPiecesDemandees(a: Acteur, contenu: Buffer): Promise<PiecesExtraites & { texteLu: boolean }> {
  if (!estInterne(a)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
  if (contenu.length === 0 || contenu.length > 4 * 1024 * 1024) throw new ErreurMetier('Fichier vide ou trop gros (4 Mo maximum).')
  if (contenu.subarray(0, 5).toString('latin1') !== '%PDF-') throw new ErreurMetier('Ce fichier n’est pas un PDF.')
  let texte = ''
  try { texte = await extraireTextePdf(contenu) } catch { throw new ErreurMetier('Impossible de lire ce PDF (protégé ou abîmé). Saisissez la liste à la main.') }
  if (texte.trim().length < 20) return { lignes: [], types: [], texteLu: false } // PDF scanné (image) : pas de texte à lire
  return { ...extrairePiecesDemandees(texte), texteLu: true }
}

// Enregistre la liste (relue par l'utilisateur) : la demande passe en « informations manquantes » si elle ne l'est pas déjà.
export async function enregistrerPiecesDemandees(a: Acteur, demandeId: number, liste: string[]) {
  if (!estInterne(a)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
  const lignes = liste.map(nettoyer).filter(Boolean).slice(0, 30)
  if (lignes.length === 0) throw new ErreurMetier('Indiquez au moins une pièce demandée.')
  const d = await prisma.finDemande.findUnique({ where: { id: demandeId } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  if (!['ENVOYEE', 'INFOS_MANQUANTES'].includes(d.statut)) throw new ErreurMetier('Les pièces ne peuvent être demandées que sur une demande envoyée au financeur.')
  const texte = lignes.map(l => `• ${l}`).join('\n')
  const passeEnOrange = d.statut !== 'INFOS_MANQUANTES'
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id: demandeId }, data: { infosManquantes: texte, ...(passeEnOrange ? { statut: 'INFOS_MANQUANTES', etapeSignature: null } : {}) } }),
    prisma.finHistorique.create({ data: { demandeId, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: 'INFOS_MANQUANTES', commentaire: `Pièces demandées par le financeur : ${lignes.join(' ; ')}`.slice(0, 900) } }),
  ])
  if (passeEnOrange) await notifierChangement({ demandeId, acteurId: a.id, statutAvant: d.statut, etapeAvant: d.etapeSignature, statutApres: 'INFOS_MANQUANTES', etapeApres: null })
  return { ok: true }
}
