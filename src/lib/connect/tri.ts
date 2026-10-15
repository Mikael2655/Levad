/** Ordre alphabétique des noms, sans tenir compte des majuscules ni des accents (la base trie « AMG » avant « Adhex »). Tri stable. */
export const comparerNoms = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' })

export function trierParNom<T extends { nom: string }>(liste: T[]): T[] {
  return [...liste].sort((a, b) => comparerNoms(a.nom, b.nom))
}
