// Les clients saisissent leur nom à la main (« Dupont SARL », « DUPONT », « Ets Dupont »...).
// On en déduit une clé simple pour reconnaître la même société d'un relevé à l'autre.

const MOTS_SANS_VALEUR = new Set([
  'sarl', 'sas', 'sasu', 'eurl', 'sa', 'sci', 'snc', 'ets', 'etablissements', 'etablissement',
  'societe', 'ste', 'cie', 'et', 'de', 'la', 'le', 'les', 'du', 'des',
])

export function cleClient(nom: string): string {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const utiles = base.split(' ').filter((m) => m && !MOTS_SANS_VALEUR.has(m))
  return (utiles.length ? utiles : base.split(' ')).join(' ') || 'sans nom'
}
