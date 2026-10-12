import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'

// Lecture par IA d'un relevé de compteurs reçu en PDF ou en photo d'écran (clients non reliés au programme).

export type LigneCompteur = { numero: number; nom: string; valeur: number }
export type Lecture = {
  serie: string | null
  modele: string | null
  ip: string | null
  dateImprimee: string | null // AAAA-MM-JJ, indicative
  compteurs: LigneCompteur[]
  doute: string | null
}

const CONSIGNE = `Tu lis un relevé de compteurs d'un copieur Canon : soit un rapport imprimé (PDF), soit une photo de l'écran tactile de la machine. Le document peut contenir PLUSIEURS pages ou écrans : fais une entrée par machine / par page de relevé. La photo peut être penchée ou tournée : lis-la quand même.

Pour chaque relevé, extrais :
- "serie" : numéro de série tel qu'écrit (ex. 4CF09718, 2GE09790, QTS27921), sinon null. Attention aux confusions 0/O et 1/I : recopie exactement.
- "modele" : modèle de la machine tel qu'écrit, SANS la partie entre parenthèses (ex. « iR-ADV C3826 »), sinon null.
- "ip" : adresse IP si elle est affichée (ex. 192.168.1.113), sinon null.
- "date_imprimee" : date du relevé si elle est imprimée, au format AAAA-MM-JJ, sinon null.
- "compteurs" : UNIQUEMENT les lignes qui commencent par un numéro de compteur à 3 chiffres (101, 102, 106, 109, 112, 113, 122, 123, 301, 501…). Pour chacune : "numero" (nombre), "nom" (libellé sans le numéro, ex. « Total (Noir/Grand format) »), "valeur" (nombre entier, sans zéros devant ni espaces). Ignore les lignes sans numéro de compteur (ex. « Lecture noir 1 »). Sur une photo où les libellés et les valeurs sont dans deux colonnes, associe-les ligne à ligne dans l'ordre.
- "doute" : phrase courte si un chiffre est flou ou incertain (en précisant lequel), sinon null.

N'invente rien : si une information est absente, mets null. Réponds uniquement avec ce JSON, sans markdown :
{"releves":[{"serie":null,"modele":null,"ip":null,"date_imprimee":null,"compteurs":[{"numero":112,"nom":"...","valeur":0}],"doute":null}]}`

function extraireJson(texte: string): any {
  const debut = texte.indexOf('{')
  const fin = texte.lastIndexOf('}')
  if (debut < 0 || fin < debut) throw new Error('Réponse illisible')
  return JSON.parse(texte.slice(debut, fin + 1))
}

export async function lireDocument(donnees: Buffer, mime: string): Promise<Lecture[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Clé ANTHROPIC_API_KEY absente')
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const b64 = donnees.toString('base64')
  const bloc: Anthropic.ContentBlockParam =
    mime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image', source: { type: 'base64', media_type: mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: b64 } }
  const rep = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: [bloc, { type: 'text', text: CONSIGNE }] }],
  })
  const texte = rep.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n')
  const json = extraireJson(texte)
  const liste: any[] = Array.isArray(json.releves) ? json.releves : []
  return liste.map((r) => {
    const compteurs: LigneCompteur[] = (Array.isArray(r.compteurs) ? r.compteurs : [])
      .map((c: any) => ({ numero: Number(c.numero), nom: String(c.nom ?? '').slice(0, 120), valeur: Number(c.valeur) }))
      .filter((c: LigneCompteur) => Number.isInteger(c.numero) && c.numero > 0 && Number.isFinite(c.valeur))
    const txt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
    const d = typeof r.date_imprimee === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date_imprimee) ? r.date_imprimee : null
    return { serie: txt(r.serie, 80), modele: txt(r.modele, 120), ip: txt(r.ip, 45), dateImprimee: d, compteurs, doute: txt(r.doute, 300) }
  })
}

/** Machine déjà connue pour ce numéro de série (reconnaissance automatique). */
export async function machineParSerie(serie: string | null) {
  if (!serie) return null
  const m = await prisma.connectMachine.findFirst({
    where: { numeroSerie: { equals: serie.trim(), mode: 'insensitive' } },
    include: { client: true },
  })
  return m ? { id: m.id, clientId: m.clientId, clientNom: m.client.nom } : null
}
