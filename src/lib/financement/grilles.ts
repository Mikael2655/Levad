// Édition des grilles de taux : conversion entre les lignes stockées en base et la matrice affichée à l'écran
// (durées en lignes, tranches de montant en colonnes), lecture d'un tableau collé depuis Excel, validation.
import type { LigneGrille } from './calcul'

export interface Matrice {
  minimumsEuros: number[] // minimum de chaque tranche, croissant
  durees: number[] // en mois
  cellules: (number | null)[][] // cellules[durée][tranche], coefficient en %
}

export function lignesVersMatrice(lignes: LigneGrille[]): Matrice {
  const minimums = Array.from(new Set(lignes.map(l => l.montantMinCentimes))).sort((a, b) => a - b)
  const durees = Array.from(new Set(lignes.map(l => l.dureeMois))).sort((a, b) => a - b)
  const cellules = durees.map(d =>
    minimums.map(m => {
      const l = lignes.find(x => x.dureeMois === d && x.montantMinCentimes === m)
      return l ? l.coefficientBp / 100 : null
    }),
  )
  return { minimumsEuros: minimums.map(m => m / 100), durees, cellules }
}

export function matriceVersLignes(m: Matrice): LigneGrille[] {
  const lignes: LigneGrille[] = []
  m.durees.forEach((dureeMois, i) =>
    m.minimumsEuros.forEach((min, j) => {
      const pct = m.cellules[i]?.[j]
      if (pct != null) lignes.push({ dureeMois, montantMinCentimes: Math.round(min * 100), coefficientBp: Math.round(pct * 100) })
    }),
  )
  return lignes
}

// Liste des problèmes (vide = grille valide). Toutes les cases doivent être remplies : une case vide
// ferait « fusionner » deux tranches sans que personne ne s'en aperçoive.
export function validerMatrice(m: Matrice): string[] {
  const e: string[] = []
  if (m.durees.length === 0) e.push('Ajoutez au moins une durée.')
  if (m.minimumsEuros.length === 0) e.push('Ajoutez au moins une tranche de montant.')
  if (e.length) return e
  if (m.durees.some(d => !Number.isInteger(d) || d <= 0 || d > 120)) e.push('Les durées doivent être des nombres entiers de mois (1 à 120).')
  if (new Set(m.durees).size !== m.durees.length) e.push('Une durée apparaît deux fois.')
  if (m.minimumsEuros.some(x => !Number.isFinite(x) || x < 0)) e.push('Les minimums de tranche doivent être des montants positifs.')
  for (let j = 1; j < m.minimumsEuros.length; j++) {
    if (!(m.minimumsEuros[j] > m.minimumsEuros[j - 1])) e.push('Les minimums de tranche doivent être strictement croissants.')
  }
  if (m.cellules.length !== m.durees.length || m.cellules.some(r => r.length !== m.minimumsEuros.length)) e.push('Le tableau est incomplet.')
  else if (m.cellules.some(r => r.some(c => c == null || !Number.isFinite(c)))) e.push('Toutes les cases doivent être remplies.')
  else if (m.cellules.some(r => r.some(c => (c as number) <= 0 || (c as number) > 50))) e.push('Les coefficients doivent être compris entre 0 et 50 %.')
  return Array.from(new Set(e))
}

function nombre(brut: string): number {
  return Number(brut.replace(/[\s €%]/g, '').replace(',', '.'))
}

// Tableau collé depuis Excel (tabulations) ou fichier CSV (point-virgule) :
//   1re ligne : un libellé puis le minimum de chaque tranche (en €)
//   lignes suivantes : la durée (« 36 » mois ou « 12T » trimestres) puis un coefficient (en %) par tranche
export function lireTexteMatrice(texte: string): { matrice?: Matrice; erreurs: string[] } {
  const lignes = texte.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lignes.length < 2) return { erreurs: ['Collez au moins une ligne d’en-tête et une ligne de durée.'] }
  const separateur = lignes[0].includes('\t') ? '\t' : ';'
  const cases = lignes.map(l => l.split(separateur).map(c => c.trim()))
  const minimumsEuros = cases[0].slice(1).map(nombre)
  if (minimumsEuros.length === 0 || minimumsEuros.some(Number.isNaN)) return { erreurs: ['1re ligne : indiquez le minimum de chaque tranche en euros (ex. 500 ; 2501 ; 5001).'] }
  const erreurs: string[] = []
  const durees: number[] = []
  const cellules: (number | null)[][] = []
  cases.slice(1).forEach((ligne, i) => {
    const libelle = ligne[0].replace(/\s/g, '').toUpperCase()
    const trimestres = libelle.endsWith('T')
    const duree = nombre(trimestres ? libelle.slice(0, -1) : libelle) * (trimestres ? 3 : 1)
    if (!Number.isFinite(duree)) return erreurs.push(`Ligne ${i + 2} : durée illisible (« ${ligne[0]} »).`)
    const valeurs = ligne.slice(1).map(nombre)
    if (valeurs.length !== minimumsEuros.length || valeurs.some(Number.isNaN)) return erreurs.push(`Ligne ${i + 2} : il faut ${minimumsEuros.length} coefficients, lisibles.`)
    durees.push(duree)
    cellules.push(valeurs)
  })
  if (erreurs.length) return { erreurs }
  const matrice = { minimumsEuros, durees, cellules }
  const problemes = validerMatrice(matrice)
  return problemes.length ? { erreurs: problemes } : { matrice, erreurs: [] }
}
