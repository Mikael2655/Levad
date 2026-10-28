// Lecture d'un fichier .xlsx ou .csv déposé pour l'import : renvoie la ligne d'en-tête et les lignes de données en texte.
import ExcelJS from 'exceljs'
import { ErreurMetier } from './erreurs'
import { lireCsv } from './import-contrats'

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

export async function lireFichier(nom: string, contenu: Buffer): Promise<{ entetes: string[]; lignes: string[][] }> {
  const extension = nom.toLowerCase().split('.').pop()
  let tableau: string[][]
  if (extension === 'xlsx') {
    const classeur = new ExcelJS.Workbook()
    try {
      await classeur.xlsx.load(contenu as unknown as ArrayBuffer)
    } catch {
      throw new ErreurMetier('Fichier Excel illisible.')
    }
    const feuille = classeur.worksheets[0]
    if (!feuille) throw new ErreurMetier('Le fichier ne contient aucune feuille.')
    tableau = []
    feuille.eachRow({ includeEmpty: false }, ligne => {
      const cellules: string[] = []
      for (let c = 1; c <= feuille.columnCount; c++) cellules.push(cellule(ligne.getCell(c).value).trim())
      tableau.push(cellules)
    })
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
