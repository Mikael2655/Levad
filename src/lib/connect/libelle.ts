type Nommee = { nomAffiche?: string | null; modele?: string | null; nomReseau?: string | null }

/** Nom montré partout : le nom choisi à la main, sinon « modèle détecté / nom donné par le client » (ex. iR-ADV C5870 / DFM-Compta). */
export function libelleMachine(m: Nommee, defaut = 'Machine inconnue'): string {
  if (m.nomAffiche) return m.nomAffiche
  const modele = m.modele?.trim() || ''
  const nom = m.nomReseau?.trim() || ''
  if (modele && nom && modele.toLowerCase() !== nom.toLowerCase()) return `${modele} / ${nom}`
  return modele || nom || defaut
}
