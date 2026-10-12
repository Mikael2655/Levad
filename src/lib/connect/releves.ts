/** Le relevé le plus récent qui contient des niveaux d'encre (un relevé importé depuis un PDF / une photo n'en a pas). */
export function avecEncres<T extends { encres: unknown }>(releves: T[]): T | undefined {
  return releves.find((r) => Array.isArray(r.encres) && r.encres.length > 0)
}
