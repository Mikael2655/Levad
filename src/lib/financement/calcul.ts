// Moteur de calcul des loyers. Fonctions pures (aucun accès base de données) : facile à tester.
// Montants en centimes (entiers). Coefficients de grille en dix-millièmes (595 = 5,95 %).
// Les coefficients « par période » sont en millionièmes (59500 = 5,95 %) pour rester exacts avec la majoration mensuelle.

export type Base = 'MENSUEL' | 'TRIMESTRIEL'
export type Periodicite = 'MENSUELLE' | 'TRIMESTRIELLE'

export interface LigneGrille {
  dureeMois: number
  montantMinCentimes: number // la tranche court jusqu'au minimum de la suivante
  coefficientBp: number
}

export interface Grille {
  base: Base
  lignes: LigneGrille[]
}

export interface Resultat {
  montantCentimes: number
  coefficientPpm: number
  horsTranche: boolean // aucun montant cohérent avec une tranche : valeur approchée, à signaler
}

// Coefficient appliqué à UNE période de paiement, en millionièmes.
export function coefficientPeriodePpm(base: Base, periodicite: Periodicite, coefficientBp: number, majorationMensuelleBp: number): number {
  const ppm = coefficientBp * 100
  if (base === 'MENSUEL') {
    return periodicite === 'TRIMESTRIELLE' ? ppm * 3 : Math.round((ppm * (10000 + majorationMensuelleBp)) / 10000)
  }
  return periodicite === 'TRIMESTRIELLE' ? ppm : Math.round((ppm * (10000 + majorationMensuelleBp)) / 30000)
}

function tranches(grille: Grille, dureeMois: number): LigneGrille[] {
  return grille.lignes.filter(l => l.dureeMois === dureeMois).sort((a, b) => a.montantMinCentimes - b.montantMinCentimes)
}

export function dureesGrille(grille: Grille): number[] {
  return Array.from(new Set(grille.lignes.map(l => l.dureeMois))).sort((a, b) => a - b)
}

// Durées proposables à la saisie : présentes dans les deux grilles (sinon un des deux calculs serait impossible).
export function dureesDisponibles(reelle: Grille, commerciale: Grille): number[] {
  const reelles = new Set(dureesGrille(reelle))
  return dureesGrille(commerciale).filter(d => reelles.has(d))
}

// Du loyer au montant : on essaie chaque tranche, on garde celles dont le montant obtenu tombe bien dans la tranche,
// et parmi elles le montant le plus élevé (cas d'un loyer à cheval sur deux tranches).
export function montantDepuisLoyer(grille: Grille, dureeMois: number, periodicite: Periodicite, majorationMensuelleBp: number, loyerCentimes: number): Resultat | null {
  const t = tranches(grille, dureeMois)
  if (t.length === 0 || loyerCentimes <= 0) return null
  const candidats = t.map((ligne, i) => {
    const coefficientPpm = coefficientPeriodePpm(grille.base, periodicite, ligne.coefficientBp, majorationMensuelleBp)
    const montantCentimes = Math.round((loyerCentimes * 1_000_000) / coefficientPpm)
    const max = i + 1 < t.length ? t[i + 1].montantMinCentimes : Infinity
    const ecart = montantCentimes < ligne.montantMinCentimes ? ligne.montantMinCentimes - montantCentimes : montantCentimes >= max ? montantCentimes - max + 1 : 0
    return { montantCentimes, coefficientPpm, ecart }
  })
  const valides = candidats.filter(c => c.ecart === 0)
  if (valides.length > 0) {
    const meilleur = valides.reduce((a, b) => (b.montantCentimes > a.montantCentimes ? b : a))
    return { montantCentimes: meilleur.montantCentimes, coefficientPpm: meilleur.coefficientPpm, horsTranche: false }
  }
  const proche = candidats.reduce((a, b) => (b.ecart < a.ecart ? b : a))
  return { montantCentimes: proche.montantCentimes, coefficientPpm: proche.coefficientPpm, horsTranche: true }
}

// Du montant au loyer : la tranche est celle du montant.
export function loyerDepuisMontant(grille: Grille, dureeMois: number, periodicite: Periodicite, majorationMensuelleBp: number, montantCentimes: number): { loyerCentimes: number; coefficientPpm: number; horsTranche: boolean } | null {
  const t = tranches(grille, dureeMois)
  if (t.length === 0 || montantCentimes <= 0) return null
  const horsTranche = montantCentimes < t[0].montantMinCentimes
  const ligne = [...t].reverse().find(l => l.montantMinCentimes <= montantCentimes) ?? t[0]
  const coefficientPpm = coefficientPeriodePpm(grille.base, periodicite, ligne.coefficientBp, majorationMensuelleBp)
  return { loyerCentimes: Math.round((montantCentimes * coefficientPpm) / 1_000_000), coefficientPpm, horsTranche }
}

export interface CalculDemande {
  commercial: Resultat
  reel: Resultat
  margeCentimes: number // montant financé réel - montant commercial
}

// Le loyer est le point de départ : chaque grille en déduit son propre montant.
export function calculerDemande(p: {
  loyerCentimes: number
  dureeMois: number
  periodicite: Periodicite
  majorationMensuelleBp: number
  grilleReelle: Grille
  grilleCommerciale: Grille
}): CalculDemande | null {
  const commercial = montantDepuisLoyer(p.grilleCommerciale, p.dureeMois, p.periodicite, p.majorationMensuelleBp, p.loyerCentimes)
  const reel = montantDepuisLoyer(p.grilleReelle, p.dureeMois, p.periodicite, p.majorationMensuelleBp, p.loyerCentimes)
  if (!commercial || !reel) return null
  return { commercial, reel, margeCentimes: reel.montantCentimes - commercial.montantCentimes }
}
