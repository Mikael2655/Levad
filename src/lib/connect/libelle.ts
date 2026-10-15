type Nommee = { nomAffiche?: string | null; modele?: string | null; nomReseau?: string | null }

/** Nom montré partout : le nom choisi à la main, sinon « modèle détecté / nom donné par le client » (ex. iR-ADV C5870 / DFM-Compta). */
export function libelleMachine(m: Nommee, defaut = 'Machine inconnue'): string {
  if (m.nomAffiche) return m.nomAffiche
  const modele = m.modele?.trim() || ''
  const nom = m.nomReseau?.trim() || ''
  if (modele && nom && modele.toLowerCase() !== nom.toLowerCase()) return `${modele} / ${nom}`
  return modele || nom || defaut
}

/** Machines regroupées par site d'installation, sites par ordre alphabétique ; dans chaque site, les machines hors contrat passent en dernier (l'ordre des autres ne change pas). */
export function groupesParSite<T extends { site: string; horsContrat?: boolean }>(machines: T[]): [string, T[]][] {
  const m = new Map<string, T[]>()
  for (const x of machines) m.set(x.site, [...(m.get(x.site) ?? []), x])
  for (const [site, liste] of Array.from(m.entries())) {
    m.set(site, [...liste.filter((x) => !x.horsContrat), ...liste.filter((x) => x.horsContrat)])
  }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
}
