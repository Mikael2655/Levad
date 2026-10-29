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

// --- Statut du contrat : en cours / tacite / clôturé ------------------------------------------------------------------
// Au terme, un contrat non dénoncé est prolongé tacitement d'un an (et ainsi de suite chaque année). Un contrat dénoncé
// s'arrête au terme ; un contrat soldé avant son terme (rachat) est clôturé à la date d'effet.

export type StatutContrat = 'EN_COURS' | 'TACITE' | 'CLOTURE'

export function statutContrat(c: { dateFin: Date | null; denonceLe: Date | null; clotureLe: Date | null }, maintenant: Date = new Date()): StatutContrat {
  if (c.clotureLe) return 'CLOTURE'
  if (!c.dateFin || c.dateFin.getTime() >= maintenant.getTime()) return 'EN_COURS'
  if (!c.denonceLe) return 'TACITE'
  // dénoncé : le contrat s'arrête au terme en cours à la date de dénonciation (terme initial, ou anniversaire suivant)
  const arret = c.denonceLe.getTime() <= c.dateFin.getTime() ? c.dateFin : prochaineReconduction(c.dateFin, c.denonceLe)
  return arret.getTime() >= maintenant.getTime() ? 'TACITE' : 'CLOTURE'
}

// Dernier loyer = fin du contrat moins une période (1er loyer + (nombre de loyers - 1) périodes).
export const dernierLoyer = (dateFin: Date | null, periodicite: string): Date | null => (dateFin ? ajouterMois(dateFin, periodicite === 'MENSUELLE' ? -1 : -3) : null)

// Prochaine reconduction tacite : fin initiale + 1 an, + 2 ans... (première date à venir).
export function prochaineReconduction(dateFin: Date, maintenant: Date = new Date()): Date {
  let n = 1
  while (ajouterMois(dateFin, 12 * n).getTime() < maintenant.getTime()) n++
  return ajouterMois(dateFin, 12 * n)
}
