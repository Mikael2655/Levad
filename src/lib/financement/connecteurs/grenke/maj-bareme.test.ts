import { describe, expect, it } from 'vitest'
import { montantsAMesurer, planifier, problemesGrille, type EntreeCommerciale, type GrilleEntree } from './maj-bareme'

// Barème réel mensuel : 2 tranches (500 € et 5 000 €), durées 36 et 48. Ancien coefficient trop bas de 4 pb.
const reelle: GrilleEntree = {
  base: 'MENSUEL',
  lignes: [
    { dureeMois: 36, montantMinCentimes: 50000, coefficientBp: 340 }, { dureeMois: 36, montantMinCentimes: 500000, coefficientBp: 315 },
    { dureeMois: 48, montantMinCentimes: 50000, coefficientBp: 270 }, { dureeMois: 48, montantMinCentimes: 500000, coefficientBp: 250 },
  ],
}
// commercial trimestriel = 3 × réel + 20 pb d'écart (calculé avec les anciens coefficients)
const commercial: EntreeCommerciale = {
  cle: '1', libelle: 'Commun',
  grille: { base: 'TRIMESTRIEL', lignes: [
    { dureeMois: 36, montantMinCentimes: 50000, coefficientBp: 1040 }, { dureeMois: 36, montantMinCentimes: 500000, coefficientBp: 965 },
    { dureeMois: 48, montantMinCentimes: 50000, coefficientBp: 830 }, { dureeMois: 48, montantMinCentimes: 500000, coefficientBp: 770 },
  ] },
}
// Grenke : monthly = bp × montant / 10000
const loyer = (montant: number, bp: number) => Math.round((montant * bp) / 10000)
const echantillon = (montant: number, coefs: Record<number, number>) => ({ montantCentimes: montant, loyerMensuelParDuree: Object.fromEntries(Object.entries(coefs).map(([d, bp]) => [d, loyer(montant, bp)])) })

describe('mise à jour des barèmes depuis Grenke', () => {
  const tranche1 = { 18: 520, 36: 344, 48: 274 }
  const tranche2 = { 18: 480, 24: 400, 30: 360, 36: 319, 48: 254 }
  const echantillons = [echantillon(50000, tranche1), echantillon(499900, tranche1), echantillon(500000, tranche2), echantillon(2000000, tranche2)]

  it('mesure deux montants par tranche et le montant de contrôle', () => {
    expect(montantsAMesurer(reelle)).toEqual([50000, 499900, 500000])
  })

  it('corrige les coefficients réels et ajoute les durées proposées par Grenke', () => {
    const p = planifier(reelle, [commercial], echantillons)
    const l = (d: number, m: number) => p.reelle.lignes.find(x => x.dureeMois === d && x.montantMinCentimes === m)?.coefficientBp
    expect(l(36, 50000)).toBe(344)
    expect(l(36, 500000)).toBe(319)
    expect(l(48, 500000)).toBe(254)
    expect(p.reelle.durees.ajoutees).toEqual([18]) // 24 et 30 absents d'une tranche : pas ajoutées
    expect(p.reelle.anomalies.join(' ')).toContain('non ajoutée')
  })

  it('ajoute les durées complètes et recopie la majoration commerciale', () => {
    const complet = [echantillon(50000, { ...tranche1, 24: 410, 30: 365 }), echantillon(499900, { ...tranche1, 24: 410, 30: 365 }), echantillon(500000, tranche2), echantillon(2000000, tranche2)]
    const p = planifier(reelle, [commercial], complet)
    expect(p.reelle.durees.ajoutees).toEqual([18, 24, 30])
    const c = p.commerciales[0]
    // majoration à 36 mois = 1040 − 3×344 = 8 pb ; tranche 2 : 965 − 3×319 = 8 pb
    expect(c.dureeReference).toBe(36)
    expect(c.lignes.find(x => x.dureeMois === 24 && x.montantMinCentimes === 50000)?.coefficientBp).toBe(3 * 410 + 8)
    expect(c.lignes.find(x => x.dureeMois === 30 && x.montantMinCentimes === 500000)?.coefficientBp).toBe(3 * 360 + 8)
    // les coefficients commerciaux existants ne changent pas
    expect(c.lignes.find(x => x.dureeMois === 36 && x.montantMinCentimes === 50000)?.coefficientBp).toBe(1040)
    expect(problemesGrille(c.lignes)).toEqual([])
  })

  it('signale des tranches qui ne coïncident pas', () => {
    const faux = [echantillon(50000, { 36: 344 }), echantillon(499900, { 36: 330 }), echantillon(500000, { 36: 319 })]
    const p = planifier(reelle, [], faux)
    expect(p.reelle.anomalies.join(' ')).toContain('ne sont pas les nôtres')
    expect(p.reelle.lignes.find(x => x.dureeMois === 36 && x.montantMinCentimes === 50000)?.coefficientBp).toBe(340)
  })

  it('laisse inchangées les durées inconnues de Grenke et calcule le contrôle', () => {
    const p = planifier(reelle, [], [echantillon(500000, { 36: 323 })])
    expect(p.reelle.durees.inchangees).toContain(48)
    expect(p.controle.loyerTrimestrielGrenke).toBeCloseTo(484.5, 2)
  })
})
