// Barèmes de départ, repris des documents fournis (« Votre barème LEVAD 2% » de Grenke et « Barèmes location 2025 »).
// Servent à remplir la base la première fois (script prisma/seed-financement.ts) ; ensuite l'admin les modifie dans l'application.
import type { LigneGrille } from './calcul'

// Grenke, barème réel : coefficients MENSUELS en %, par durée (en trimestres x 3 = mois) et par tranche de montant.
// Tranches : 500 / 2 501 / 5 001 / 12 501 / 25 001 / 37 501 / 50 001 €.
// À compléter : les durées 13 et 17 trimestres (39 et 51 mois), que Grenke ne liste pas dans ce barème.
const MINIMUMS_GRENKE_EUROS = [500, 2501, 5001, 12501, 25001, 37501, 50001]
const GRENKE_REEL: Record<number, number[]> = {
  36: [3.17, 3.16, 3.15, 3.14, 3.13, 3.12, 3.1],
  42: [2.77, 2.76, 2.74, 2.73, 2.72, 2.71, 2.69],
  48: [2.47, 2.46, 2.44, 2.43, 2.42, 2.4, 2.38],
  54: [2.23, 2.22, 2.2, 2.19, 2.18, 2.17, 2.15],
  60: [2.05, 2.04, 2.01, 2.0, 1.99, 1.98, 1.96],
  63: [1.96, 1.95, 1.93, 1.92, 1.91, 1.9, 1.88],
}

// Barème commercial Grenke : coefficients TRIMESTRIELS en %, durées 12/13/16/17/20/21 trimestres, 3 tranches (0 / 10 000 / 25 000 €).
const MINIMUMS_COMMERCIAL_EUROS = [0, 10000, 25000]
const COMMERCIAL: Record<number, number[]> = {
  36: [9.85, 9.7, 9.65],
  39: [9.35, 9.15, 9.05],
  48: [7.6, 7.45, 7.4],
  51: [7.2, 7.1, 7.0],
  60: [6.3, 6.15, 6.1],
  63: [6.05, 5.95, 5.85],
}

function construire(table: Record<number, number[]>, minimumsEuros: number[]): LigneGrille[] {
  const lignes: LigneGrille[] = []
  for (const [duree, coefs] of Object.entries(table)) {
    coefs.forEach((pct, i) => {
      // pct en % -> dix-millièmes (5,95 % = 595)
      lignes.push({ dureeMois: Number(duree), montantMinCentimes: Math.round(minimumsEuros[i] * 100), coefficientBp: Math.round(pct * 100) })
    })
  }
  return lignes
}

export const GRENKE_REEL_LIGNES = construire(GRENKE_REEL, MINIMUMS_GRENKE_EUROS)
export const COMMERCIAL_LIGNES = construire(COMMERCIAL, MINIMUMS_COMMERCIAL_EUROS)

// Solubail (courtier) : barème commercial seulement (pas de barème réel connu), coefficients TRIMESTRIELS en %,
// durées 12/13/16/17/20/21 trimestres, tranches 0 / 10 000 / 25 000 €. Paiement mensuel : majoration de 1,5 %.
const SOLUBAIL: Record<number, number[]> = {
  36: [10.7, 10.55, 10.45],
  39: [10.15, 9.95, 9.85],
  48: [8.25, 8.15, 8.05],
  51: [7.85, 7.75, 7.65],
  60: [6.85, 6.7, 6.65],
  63: [6.6, 6.5, 6.4],
}
export const SOLUBAIL_COMMERCIAL_LIGNES = construire(SOLUBAIL, MINIMUMS_COMMERCIAL_EUROS)
