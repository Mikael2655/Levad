// Lecteur .xlsx de secours : quand ExcelJS n'arrive pas à ouvrir un fichier (export d'un portail, d'un logiciel, de Numbers...),
// on lit directement le contenu du fichier (c'est une archive zip de fichiers XML) : première feuille, textes et nombres, dates.
import JSZip from 'jszip'

const entites = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&')
const attribut = (balise: string, nom: string) => new RegExp(`(?:^|[\\s])${nom}\\s*=\\s*"([^"]*)"`).exec(balise)?.[1]
const texteDe = (xml: string) => Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)).map(m => entites(m[1])).join('')

const FORMATS_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58])
function formatDate(code: string): boolean {
  const nu = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '')
  return /[dmyhs]/i.test(nu) && !/^general$/i.test(code.trim())
}

const colonne = (ref: string) => {
  let n = 0
  for (const c of ref.replace(/[^A-Za-z]/g, '').toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

function serieVersDate(n: number): string {
  const ms = Math.round(n * 86_400_000)
  return new Date(Date.UTC(1899, 11, 30) + ms).toISOString().slice(0, 10)
}

export async function lireXlsxSimple(contenu: Buffer): Promise<string[][]> {
  const zip = await JSZip.loadAsync(contenu)
  const lire = async (chemin: string) => (await zip.file(chemin)?.async('string')) ?? null

  // première feuille du classeur
  const classeur = (await lire('xl/workbook.xml')) ?? ''
  const rels = (await lire('xl/_rels/workbook.xml.rels')) ?? ''
  const premiere = /<sheet\b[^>]*>/.exec(classeur)?.[0]
  const rid = premiere ? attribut(premiere, 'r:id') : undefined
  let chemin = 'xl/worksheets/sheet1.xml'
  if (rid) {
    const rel = Array.from(rels.matchAll(/<Relationship\b[^>]*>/g)).map(m => m[0]).find(b => attribut(b, 'Id') === rid)
    const cible = rel ? attribut(rel, 'Target') : undefined
    if (cible) chemin = cible.startsWith('/') ? cible.slice(1) : `xl/${cible}`
  }
  let feuille = await lire(chemin)
  if (feuille === null) {
    const autre = Object.keys(zip.files).find(f => /^xl\/worksheets\/[^/]+\.xml$/.test(f))
    feuille = autre ? await lire(autre) : null
  }
  if (feuille === null) throw new Error('feuille introuvable')

  const partages = Array.from(((await lire('xl/sharedStrings.xml')) ?? '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map(m => texteDe(m[1]))

  // styles : quelles cellules sont des dates
  const styles = (await lire('xl/styles.xml')) ?? ''
  const personnalises = new Map<number, string>()
  for (const m of Array.from(styles.matchAll(/<numFmt\b[^>]*>/g))) {
    const id = attribut(m[0], 'numFmtId')
    const code = attribut(m[0], 'formatCode')
    if (id && code !== undefined) personnalises.set(Number(id), entites(code))
  }
  const blocXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? ''
  const styleEstDate = Array.from(blocXfs.matchAll(/<xf\b[^>]*>/g)).map(m => {
    const id = Number(attribut(m[0], 'numFmtId') ?? 0)
    const code = personnalises.get(id)
    return code !== undefined ? formatDate(code) : FORMATS_DATE.has(id)
  })

  const lignes: string[][] = []
  for (const l of Array.from(feuille.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g))) {
    const cellules: string[] = []
    for (const c of Array.from((l[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g))) {
      const ref = attribut(c[1], 'r')
      const type = attribut(c[1], 't')
      const style = Number(attribut(c[1], 's') ?? 0)
      const corps = c[2] ?? ''
      const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(corps)?.[1]
      let valeur = ''
      if (type === 's') valeur = partages[Number(v)] ?? ''
      else if (type === 'inlineStr') valeur = texteDe(corps)
      else if (type === 'str' || type === 'e') valeur = v === undefined ? '' : entites(v)
      else if (type === 'b') valeur = v === '1' ? 'VRAI' : 'FAUX'
      else if (v !== undefined && v.trim() !== '') valeur = styleEstDate[style] && Number.isFinite(Number(v)) ? serieVersDate(Number(v)) : v.trim()
      const i = ref ? colonne(ref) : cellules.length
      while (cellules.length < i) cellules.push('')
      cellules[i] = valeur.trim()
    }
    if (cellules.some(x => x !== '')) lignes.push(cellules)
  }
  return lignes
}
