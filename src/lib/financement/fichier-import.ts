// Lecture d'un fichier .xlsx ou .csv déposé pour l'import : renvoie la ligne d'en-tête et les lignes de données en texte.
import ExcelJS from 'exceljs'
import { ErreurMetier } from './erreurs'
import { lireCsv } from './import-contrats'
import { lireXlsxSimple } from './xlsx-simple'

export const MAX_LIGNES = 3000

function cellule(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('result' in v && v.result !== undefined) return cellule(v.result as ExcelJS.CellValue)
    if ('richText' in v) return v.richText.map(t => t.text).join('')
    if ('text' in v) return String(v.text)
    return ''
  }
  return String(v)
}

// Début du fichier : un vrai .xlsx est une archive zip (« PK »). Les autres cas courants sont expliqués à l'utilisateur.
async function lireClasseur(contenu: Buffer): Promise<string[][]> {
  const zip = contenu.subarray(0, 2).toString('latin1') === 'PK'
  if (!zip) {
    if (contenu.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) throw new ErreurMetier('Ce fichier est un ancien format Excel (.xls) : ouvrez-le dans Excel, puis enregistrez-le en .xlsx ou en CSV.')
    const debut = contenu.subarray(0, 200).toString('utf8').trimStart().toLowerCase()
    if (debut.startsWith('<')) throw new ErreurMetier('Ce fichier est une page web ou un XML enregistré avec l’extension .xlsx : ouvrez-le dans Excel, puis enregistrez-le en .xlsx ou en CSV.')
    // texte simple (CSV) enregistré avec la mauvaise extension
    const texte = contenu.toString('utf8')
    if (/[;,\t]/.test(texte) && texte.includes('\n')) return lireCsv(texte.includes('�') ? new TextDecoder('windows-1252').decode(contenu) : texte)
    throw new ErreurMetier('Fichier Excel illisible : ce n’est pas un vrai fichier .xlsx. Ouvrez-le dans Excel et enregistrez-le de nouveau en .xlsx ou en CSV.')
  }
  let raison = ''
  try {
    const classeur = new ExcelJS.Workbook()
    await classeur.xlsx.load(contenu as unknown as ArrayBuffer)
    const feuille = classeur.worksheets[0]
    if (!feuille) throw new Error('aucune feuille lue')
    const tableau: string[][] = []
    feuille.eachRow({ includeEmpty: false }, ligne => {
      const cellules: string[] = []
      for (let c = 1; c <= feuille.columnCount; c++) cellules.push(cellule(ligne.getCell(c).value).trim())
      tableau.push(cellules)
    })
    if (tableau.length === 0) throw new Error('feuille vide')
    return tableau
  } catch (e) {
    raison = (e as Error).message
  }
  // ExcelJS n'a pas pu l'ouvrir : lecteur de secours
  try {
    const tableau = await lireXlsxSimple(contenu)
    if (tableau.length > 0) return tableau
    raison ||= 'feuille vide'
  } catch (e) {
    raison = `${raison} / ${(e as Error).message}`
  }
  console.error('Import : fichier Excel illisible', raison)
  throw new ErreurMetier(`Fichier Excel illisible (${raison.slice(0, 160)}). Ouvrez-le dans Excel, enregistrez-le en .xlsx ou en CSV, puis réessayez.`)
}

export async function lireFichier(nom: string, contenu: Buffer): Promise<{ entetes: string[]; lignes: string[][] }> {
  const extension = nom.toLowerCase().split('.').pop()
  let tableau: string[][]
  if (extension === 'xlsx' || extension === 'xlsm') {
    tableau = await lireClasseur(contenu)
  } else if (extension === 'csv' || extension === 'txt') {
    let texte = contenu.toString('utf8')
    if (texte.includes('�')) texte = new TextDecoder('windows-1252').decode(contenu) // CSV enregistré par Excel (ANSI)
    tableau = lireCsv(texte)
  } else {
    throw new ErreurMetier('Format non pris en charge : enregistrez le fichier en .xlsx ou .csv.')
  }
  if (tableau.length < 2) throw new ErreurMetier('Le fichier doit contenir une ligne d’en-tête puis au moins une ligne de données.')
  if (tableau.length - 1 > MAX_LIGNES) throw new ErreurMetier(`Trop de lignes (${tableau.length - 1}) : importez par lots de ${MAX_LIGNES} maximum.`)
  const largeur = Math.max(...tableau.map(l => l.length))
  const complet = tableau.map(l => Array.from({ length: largeur }, (_, i) => l[i] ?? ''))
  return { entetes: complet[0].map((e, i) => e.trim() || `Colonne ${i + 1}`), lignes: complet.slice(1) }
}
