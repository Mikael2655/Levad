// Dates de contrat : fin, mois restants, alerte d'échéance. Calculs en UTC (les dates sont stockées à minuit UTC).

export type EtatEcheance = 'INCONNUE' | 'ECHU' | 'PROCHE' | 'EN_COURS'

export const SEUIL_RENOUVELLEMENT_MOIS = 6

// Ajoute des mois sans déborder : 31 janvier + 1 mois = 28 (ou 29) février.
export function ajouterMois(d: Date, n: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n
  const annee = Math.floor(total / 12)
  const mois = total % 12
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate()
  return new Date(Date.UTC(annee, mois, Math.min(d.getUTCDate(), dernierJour)))
}

export const dateFinDepuisDebut = (debut: Date, dureeMois: number) => ajouterMois(debut, dureeMois)

// Nombre de mois COMPLETS restants (0 si le contrat est échu ou si la date est inconnue).
export function moisRestants(fin: Date | null, maintenant: Date = new Date()): number | null {
  if (!fin) return null
  if (fin.getTime() <= maintenant.getTime()) return 0
  let mois = (fin.getUTCFullYear() - maintenant.getUTCFullYear()) * 12 + (fin.getUTCMonth() - maintenant.getUTCMonth())
  if (fin.getUTCDate() < maintenant.getUTCDate()) mois -= 1
  return Math.max(0, mois)
}

export function etatEcheance(fin: Date | null, maintenant: Date = new Date(), seuilMois = SEUIL_RENOUVELLEMENT_MOIS): EtatEcheance {
  if (!fin) return 'INCONNUE'
  if (fin.getTime() <= maintenant.getTime()) return 'ECHU'
  return fin.getTime() <= ajouterMois(maintenant, seuilMois).getTime() ? 'PROCHE' : 'EN_COURS'
}
