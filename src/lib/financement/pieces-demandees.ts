// Pièces demandées par le financeur : le détail arrive par e-mail (PDF). On en extrait la liste des pièces à fournir
// pour que les commerciaux la voient directement sur la demande, sans qu'on ait à leur dire.
// L'extraction repose sur des mots-clés (Kbis, bilan, RIB...) : le résultat est toujours relu et corrigeable avant d'être enregistré.
import { prisma } from '@/lib/db'
import { estInterne, type Acteur } from './droits'
import { ErreurMetier } from './erreurs'
import { notifierChangement } from './notifications'
import { transmettrePieces } from './pieces'

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
// retire aussi l'introduction « P.S. : » des e-mails
const nettoyer = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s•\-–—*·▪■□☐✓✔]+/, '').replace(/^\d{1,2}\s?[.)]\s+/, '').replace(/^(p\.?\s?-?\s?s\.?|post[- ]?scriptum)\s*[:\-–—]\s*/i, '').trim() // retire puces et numérotation « 1. », garde « 3 derniers bilans »

// Liste affichable des pièces demandées (texte enregistré sur la demande, une pièce par ligne).
export const lignesPiecesDemandees = (texte: string | null | undefined): string[] => (texte ?? '').split('\n').map(nettoyer).filter(Boolean)

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

// Bouton « Envoyer » à côté de la liste des pièces demandées : transmet au financeur (API) les pièces encore en attente, puis la demande
// repasse « en attente — pièces envoyées ». La liste demandée est conservée pour mémoire. Ouvert à celui qui voit la demande (commercial compris).
export async function confirmerPiecesEnvoyees(a: Acteur, demandeId: number) {
  const d = await prisma.finDemande.findFirst({ where: { id: demandeId, ...(estInterne(a) ? {} : { commercialId: a.id }) } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  if (d.statut !== 'INFOS_MANQUANTES') throw new ErreurMetier('Cette demande n’attend pas de pièces.', 409)
  const r = await transmettrePieces(demandeId)
  if (r.echecs.length > 0) throw new ErreurMetier(`Certaines pièces n’ont pas pu être transmises au financeur : ${r.echecs.join(' ; ')}. Réessayez dans un instant.`, 502)
  const u = await prisma.finUtilisateur.findUnique({ where: { id: a.id }, select: { prenom: true, nom: true } })
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id: demandeId }, data: { statut: 'ENVOYEE', etapeSignature: null } }),
    prisma.finHistorique.create({ data: { demandeId, auteurId: a.id, ancienStatut: 'INFOS_MANQUANTES', nouveauStatut: 'ENVOYEE', commentaire: `Pièces envoyées${u ? ` par ${u.prenom} ${u.nom}` : ''}${r.envoyees ? ` (${r.envoyees} transmise(s) au financeur)` : ''}` } }),
  ])
  await notifierChangement({ demandeId, acteurId: a.id, statutAvant: 'INFOS_MANQUANTES', etapeAvant: d.etapeSignature, statutApres: 'ENVOYEE', etapeApres: null })
  return { ok: true, transmises: r.envoyees }
}

// --- Document reçu d'un financeur sans API : accord, refus ou demande de pièces ? ------------------------------------------------------

export interface MontantTrouve { valeurCentimes: number; contexte: string; etiquette: 'FINANCE' | 'LOYER' | null }
export type TypeDocument = 'PIECES' | 'ACCORD' | 'REFUS' | 'INCONNU'

const EURO = /(\d{1,3}(?:[ \u00a0.]\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:€|eur(?:os?)?\b)/gi

// Montants en euros trouvés dans le texte, avec la phrase autour : l'utilisateur choisit le bon (le format des PDF varie d'un financeur à l'autre).
export function extraireMontants(texte: string): MontantTrouve[] {
  const trouves: MontantTrouve[] = []
  const vus = new Set<string>()
  for (const ligne of texte.split(/\r?\n/)) {
    for (const m of Array.from(ligne.matchAll(EURO))) {
      const entier = Number(m[1].replace(/[ \u00a0.]/g, ''))
      const valeurCentimes = entier * 100 + (m[2] ? Number(m[2].padEnd(2, '0')) : 0)
      if (!Number.isFinite(valeurCentimes) || valeurCentimes <= 0) continue
      const avant = ligne.slice(Math.max(0, (m.index ?? 0) - 70), m.index ?? 0)
      const t = sansAccents(avant)
      const etiquette = /loyer|redevance|mensualite|trimestrialite/.test(t) ? 'LOYER' : /montant (finance|a financer|du financement|total)|financement|capital|prix d.?achat|investissement|valeur d.?achat/.test(t) ? 'FINANCE' : null
      const cle = `${valeurCentimes}|${etiquette}`
      if (vus.has(cle)) continue
      vus.add(cle)
      trouves.push({ valeurCentimes, contexte: nettoyer(ligne).slice(0, 120), etiquette })
    }
  }
  return trouves.sort((x, y) => Number(y.etiquette === 'FINANCE') - Number(x.etiquette === 'FINANCE')).slice(0, 8)
}

export function typeDeDocument(texte: string, nbPieces: number): TypeDocument {
  const t = sansAccents(texte)
  const accord = /\baccord (de financement|donne|favorable|obtenu|ferme)|\bnous (vous )?(confirmons|donnons) (notre|l.?)accord|financement (est )?(accorde|accepte)|dossier (est )?(accepte|accorde|valide)|agrement|avis favorable|\baccept[ee]\b/.test(t) || /\baccord\b/.test(t.replace(/d.?accord|en accord|pas d.?accord|sans accord/g, ''))
  const refus = /\brefus|\brefuse|\bdeclin|\brejet|defavorable|non accord|ne peut pas (etre )?(accepte|financ)/.test(t)
  if (refus && !accord) return 'REFUS'
  if (accord && !refus) return 'ACCORD'
  if (nbPieces > 0 && !accord && !refus) return 'PIECES'
  return 'INCONNU'
}

// Informations d'un accord, quand le PDF les donne (format observé : « ACCORD N° 75815IB », « Siren : 752975433 », « Durée du financement : 63 mois »,
// « Coefficient : 6,3800 »). Servent à vérifier que le PDF correspond bien à la demande, et à pré-remplir la note.
export interface InfosAccord { numero: string | null; siren: string | null; dureeMois: number | null; loyerCentimes: number | null; coefficient: number | null }
export function extraireInfosAccord(texte: string, montants: MontantTrouve[] = extraireMontants(texte)): InfosAccord {
  const num = texte.match(/ACCORD\s*N[°o]?\s*([A-Z0-9-]+)/i)
  const siren = texte.match(/siren\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})\b/i)
  const duree = texte.match(/dur[ée]e(?: du financement)?\s*:?\s*(\d{1,3})\s*mois/i)
  const coef = texte.match(/coefficient\s*:?\s*(\d{1,2}[,.]\d{1,4})/i)
  return {
    numero: num?.[1] ?? null,
    siren: siren ? siren[1].replace(/\s/g, '') : null,
    dureeMois: duree ? Number(duree[1]) : null,
    loyerCentimes: montants.find(m => m.etiquette === 'LOYER')?.valeurCentimes ?? null,
    coefficient: coef ? Number(coef[1].replace(',', '.')) : null,
  }
}

export type Controle = 'ok' | 'different' | 'absent'
// Compare le PDF à la demande : un PDF déposé sur la mauvaise demande se voit tout de suite.
export function controlerAccord(infos: InfosAccord, d: { siret: string; loyerCentimes: number; dureeMois: number }) {
  const siren = d.siret.replace(/\D/g, '').slice(0, 9)
  return {
    siren: (infos.siren === null || siren.length < 9 ? 'absent' : infos.siren === siren ? 'ok' : 'different') as Controle,
    loyer: (infos.loyerCentimes === null ? 'absent' : Math.abs(infos.loyerCentimes - d.loyerCentimes) <= 1 ? 'ok' : 'different') as Controle,
    duree: (infos.dureeMois === null ? 'absent' : infos.dureeMois === d.dureeMois ? 'ok' : 'different') as Controle,
  }
}

export async function analyserDocumentFinanceur(a: Acteur, contenu: Buffer, demandeId?: number) {
  const base = await analyserPdfPiecesDemandees(a, contenu)
  if (!base.texteLu) return { ...base, type: 'INCONNU' as TypeDocument, montants: [] as MontantTrouve[], infos: null as InfosAccord | null, controles: null as ReturnType<typeof controlerAccord> | null }
  const texte = await extraireTextePdf(contenu)
  const montants = extraireMontants(texte)
  const type = typeDeDocument(texte, base.lignes.length)
  const infos = type === 'ACCORD' || type === 'INCONNU' ? extraireInfosAccord(texte, montants) : null
  let controles: ReturnType<typeof controlerAccord> | null = null
  if (infos && demandeId) {
    const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, select: { siret: true, loyerCentimes: true, dureeMois: true } })
    if (d) controles = controlerAccord(infos, d)
  }
  return { ...base, type, montants, infos, controles }
}
