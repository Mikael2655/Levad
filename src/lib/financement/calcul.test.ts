import { describe, expect, it } from 'vitest'
import { calculerDemande, dureesDisponibles, loyerDepuisMontant, montantDepuisLoyer, type Grille } from './calcul'
import { GRENKE_REEL_LIGNES, COMMERCIAL_LIGNES } from './baremes'

const reelle: Grille = { base: 'MENSUEL', lignes: GRENKE_REEL_LIGNES }
const commerciale: Grille = { base: 'TRIMESTRIEL', lignes: COMMERCIAL_LIGNES }

describe('exemple de Mikael : 723 €/trimestre sur 21 trimestres', () => {
  const r = calculerDemande({ loyerCentimes: 72300, dureeMois: 63, periodicite: 'TRIMESTRIELLE', majorationMensuelleBp: 150, grilleReelle: reelle, grilleCommerciale: commerciale })!
  it('commercial : 723 / 5,95 % = 12 151,26 €', () => {
    expect(r.commercial.montantCentimes).toBe(1215126)
    expect(r.commercial.coefficientPpm).toBe(59500)
  })
  it('réel : 723 / (1,92 % x 3) = 12 552,08 €', () => {
    expect(r.reel.montantCentimes).toBe(1255208)
    expect(r.reel.coefficientPpm).toBe(57600)
  })
  it('marge = écart des deux montants', () => {
    expect(r.margeCentimes).toBe(1255208 - 1215126)
  })
})

describe('loyer à cheval sur deux tranches : on garde le meilleur montant', () => {
  it('commercial 600 €/trim sur 63 mois : 600/6,05 % = 9 917 € (0-10k) ou 600/5,95 % = 10 084 € (10k-25k) -> 10 084 €', () => {
    const r = montantDepuisLoyer(commerciale, 63, 'TRIMESTRIELLE', 150, 60000)!
    expect(r.montantCentimes).toBe(1008403)
    expect(r.coefficientPpm).toBe(59500)
    expect(r.horsTranche).toBe(false)
  })
  it('loyer qui ne passe que dans la première tranche', () => {
    const r = montantDepuisLoyer(commerciale, 63, 'TRIMESTRIELLE', 150, 50000)!
    expect(r.coefficientPpm).toBe(60500) // 500/6,05 % = 8 264 €
    expect(r.montantCentimes).toBe(826446)
  })
})

describe('durées', () => {
  it('14T et 18T (Grenke seulement) ne sont pas proposées ; 13T et 17T le seront quand le barème réel sera complété', () => {
    expect(dureesDisponibles(reelle, commerciale)).toEqual([36, 48, 60, 63])
  })
  it('durée absente d’une grille : pas de calcul', () => {
    expect(calculerDemande({ loyerCentimes: 72300, dureeMois: 42, periodicite: 'TRIMESTRIELLE', majorationMensuelleBp: 150, grilleReelle: reelle, grilleCommerciale: commerciale })).toBeNull()
  })
})

describe('paiement mensuel : majoration de 1,5 %', () => {
  it('réel mensuel : 1,92 % x 1,015', () => {
    const r = montantDepuisLoyer(reelle, 63, 'MENSUELLE', 150, 26000)!
    expect(r.coefficientPpm).toBe(19488)
  })
})

describe('du montant au loyer', () => {
  it('12 151,26 € sur 63 mois (commercial) -> 723,00 €', () => {
    const r = loyerDepuisMontant(commerciale, 63, 'TRIMESTRIELLE', 150, 1215126)!
    expect(r.loyerCentimes).toBe(72300)
  })
  it('sous le minimum de la 1re tranche : signalé hors tranche', () => {
    expect(loyerDepuisMontant(reelle, 63, 'TRIMESTRIELLE', 150, 30000)!.horsTranche).toBe(true)
  })
})
