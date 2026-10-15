import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { gammeAuto } from './gammes'

// Retrouver le vrai modèle d'un copieur Canon quand son nom réseau a été changé par le client.
// Ordre : le nom lu (s'il est reconnu) → la description technique de la machine → son nom réseau →
// un autre copieur de même début de numéro de série (le début du numéro identifie le modèle chez Canon).

// Débuts de numéros de série déjà vus sur de vraies machines (complétés automatiquement par les machines connues).
const SERIES_CONNUES: Record<string, string> = {
  '2GE': 'iR-ADV C3525 III',
  QTS: 'iR-ADV C3325',
  '4CF': 'iR-ADV C3826',
  '2XN': 'iR-ADV C5860',
}

const MOTIF = /\b(iR-ADV(?:\s+DX)?\s*[A-Z]{0,2}\s*\d{3,4}\s*[A-Za-z]{0,3}(?:\s+III)?|imageFORCE\s*[A-Z]{0,2}\s*\d{3,4}\s*[A-Za-z]{0,3}|imageRUNNER\s+ADVANCE(?:\s+DX)?\s*[A-Z]{0,2}\s*\d{3,4}\s*[A-Za-z]{0,3}|i-SENSYS\s*[A-Z]{1,4}\s*\d{3,4}\s*[A-Za-z]{0,4})/i

export function extraireModele(texte: string | null | undefined): string | null {
  const m = (texte ?? '').match(MOTIF)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

export type EntreeModele = { modele?: string | null; sysDescr?: string | null; nomReseau?: string | null; serie?: string | null }

/** Le modèle à retenir (reconnu dans la liste des gammes), ou null si on n'en trouve aucun. `exclureId` : la machine elle-même. */
export async function resoudreModele(e: EntreeModele, exclureId?: number): Promise<string | null> {
  if (e.modele && gammeAuto(e.modele)) return e.modele
  const textes = [e.modele, e.sysDescr, e.nomReseau]
  for (const t of textes) {
    const m = extraireModele(t)
    if (m && gammeAuto(m)) return m
  }
  const serie = (e.serie ?? '').trim().toUpperCase()
  if (serie.length >= 3) {
    const debut = serie.slice(0, 3)
    const voisines = await prisma.connectMachine.findMany({
      where: { numeroSerie: { startsWith: debut, mode: 'insensitive' }, modele: { not: null }, ...(exclureId ? { id: { not: exclureId } } : {}) },
      select: { modele: true },
      take: 20,
    })
    const v = voisines.find((x) => gammeAuto(x.modele))
    if (v?.modele) return v.modele
    const connu = SERIES_CONNUES[debut]
    if (connu && gammeAuto(connu)) return connu
  }
  // un modèle lisible mais absent de la liste des gammes vaut mieux qu'un nom donné par le client (la gamme se choisit alors à la main)
  for (const t of textes) {
    const m = extraireModele(t)
    if (m) return m
  }
  return null
}

// ---------------------------------------------------------------------------
// Autres marques : référence lue dans la description technique, ou cherchée avec le numéro de série.
// ---------------------------------------------------------------------------
const MOTIF_AUTRES = new RegExp(
  '\\b(' +
    [
      'MX-?\\s?[A-Z]?\\d{3,4}[A-Z]{0,3}', // Sharp MX-3071
      'BP-?\\s?\\d{2}[A-Z]\\d{2}[A-Z]{0,2}|BP-?\\s?[A-Z]?\\d{2,4}[A-Z]{0,3}', // Sharp BP-50C26
      '(?:IM|MP|SP|Pro)\\s?C?\\d{3,4}[A-Z]{0,3}', // Ricoh
      'bizhub\\s+(?:PRESS\\s+)?C?\\d{2,4}i?', // Konica Minolta
      'TASKalfa\\s+\\d{3,4}[a-z]{0,3}', // Kyocera
      'ECOSYS\\s+[A-Z]{1,2}\\d{3,4}[a-z]{0,4}',
      '(?:Color\\s+)?LaserJet\\s+[A-Za-z]*\\s?(?:M|E)?\\d{3,5}[A-Za-z]{0,4}', // HP
      '(?:MFC|DCP|HL)-\\w{3,8}', // Brother
      '(?:WorkCentre|VersaLink|AltaLink|PrimeLink)\\s+[A-Z]?\\d{3,4}[A-Z]{0,3}', // Xerox
      'WF-[A-Z]?\\d{3,5}[A-Z]{0,3}', // Epson
      '(?:MX|CX|MS|CS)\\d{3,4}[a-z]{0,4}', // Lexmark
    ].join('|') +
    ')',
  'i',
)

export function extraireModeleAutre(texte: string | null | undefined): string | null {
  const m = (texte ?? '').match(MOTIF_AUTRES)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

/** Autre marque : la référence si elle se lit dans la description technique ou le nom (sinon null). */
export function modeleAutreMarque(e: EntreeModele): string | null {
  for (const t of [e.modele, e.sysDescr, e.nomReseau]) {
    const m = extraireModeleAutre(t)
    if (m) return m
  }
  return null
}

/** Cherche la référence d'une machine avec l'IA (recherche web) d'après sa marque, son numéro de série et ce qu'elle déclare. */
export async function rechercherReference(m: { marque: string | null; serie: string | null; nom: string | null; sysDescr: string | null }): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Clé ANTHROPIC_API_KEY absente')
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `Retrouve la référence commerciale exacte (modèle) d'un copieur / imprimante professionnel.
Marque : ${m.marque ?? 'inconnue'}
Numéro de série : ${m.serie ?? 'inconnu'}
Nom déclaré par la machine (peut être un nom choisi par le client) : ${m.nom ?? 'inconnu'}
Description technique déclarée : ${m.sysDescr ?? 'inconnue'}

Utilise la recherche web (le format du numéro de série est souvent propre à chaque constructeur). Ne réponds avec un modèle que si tu es raisonnablement sûr ; sinon mets null.
Réponds uniquement avec ce JSON, sans markdown : {"modele": "référence commerciale, ex. MX-3071" ou null, "certitude": "forte" | "moyenne" | "faible"}`
  const msg = await anthropic.messages.create(
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content: prompt }],
    },
    { timeout: 50000 },
  )
  const texte = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n')
  const debut = texte.lastIndexOf('{"modele"')
  const fin = texte.indexOf('}', debut)
  if (debut < 0 || fin < 0) return null
  const r = JSON.parse(texte.slice(debut, fin + 1))
  if (typeof r.modele !== 'string' || !r.modele.trim() || r.certitude === 'faible') return null
  return r.modele.trim().slice(0, 120)
}
