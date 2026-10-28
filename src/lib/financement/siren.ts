// Numéros d'entreprise : nettoyage et contrôle de la clé (algorithme de Luhn, comme pour une carte bancaire).
export const chiffres = (s: string) => s.replace(/\D/g, '')

function luhn(n: string): boolean {
  let somme = 0
  for (let i = 0; i < n.length; i++) {
    let c = Number(n[n.length - 1 - i])
    if (i % 2 === 1) {
      c *= 2
      if (c > 9) c -= 9
    }
    somme += c
  }
  return somme % 10 === 0
}

export const sirenValide = (s: string) => /^\d{9}$/.test(s) && luhn(s)

// 9 chiffres (SIREN) ou 14 (SIRET). Seul le SIREN est contrôlé par la clé : quelques établissements
// (La Poste) ont un SIRET qui ne la respecte pas.
export function numeroEntrepriseValide(brut: string): boolean {
  const n = chiffres(brut)
  if (n.length === 9) return sirenValide(n)
  if (n.length === 14) return sirenValide(n.slice(0, 9))
  return false
}
