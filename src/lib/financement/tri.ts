// Tri des listes (demandes, contrats) : colonne + sens, valeurs vides toujours à la fin, texte comparé à la française (accents, majuscules, nombres).
export type Ordre = 'asc' | 'desc'
export type Valeur = string | number | Date | null | undefined

export const lireOrdre = (v: string | undefined): Ordre => (v === 'desc' ? 'desc' : 'asc')

const collateur = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

function comparer(a: Valeur, b: Valeur): number {
  if (a instanceof Date) a = a.getTime()
  if (b instanceof Date) b = b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collateur.compare(String(a), String(b))
}

// extracteurs : pour chaque colonne triable, la valeur à comparer. Une colonne inconnue laisse l'ordre d'origine.
export function trier<T>(lignes: T[], cle: string | undefined, ordre: Ordre, extracteurs: Record<string, (x: T) => Valeur>): T[] {
  const extraire = cle ? extracteurs[cle] : undefined
  if (!extraire) return lignes
  const sens = ordre === 'desc' ? -1 : 1
  return lignes
    .map((l, i) => ({ l, i, v: extraire(l) }))
    .sort((x, y) => {
      const vx = x.v === null || x.v === undefined || x.v === ''
      const vy = y.v === null || y.v === undefined || y.v === ''
      if (vx || vy) return vx === vy ? x.i - y.i : vx ? 1 : -1 // vides à la fin, quel que soit le sens
      return sens * comparer(x.v, y.v) || x.i - y.i
    })
    .map(x => x.l)
}
