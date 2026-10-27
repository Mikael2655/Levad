import { describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from './baremes'
import { lignesVersMatrice, lireTexteMatrice, matriceVersLignes, validerMatrice } from './grilles'

const tri = (l: { dureeMois: number; montantMinCentimes: number }[]) => [...l].sort((a, b) => a.dureeMois - b.dureeMois || a.montantMinCentimes - b.montantMinCentimes)

describe('matrice <-> lignes', () => {
  it('aller-retour sans perte sur les deux barèmes', () => {
    for (const lignes of [GRENKE_REEL_LIGNES, COMMERCIAL_LIGNES]) {
      expect(tri(matriceVersLignes(lignesVersMatrice(lignes)))).toEqual(tri(lignes))
    }
  })
  it('le barème commercial s’affiche en euros et en %', () => {
    const m = lignesVersMatrice(COMMERCIAL_LIGNES)
    expect(m.minimumsEuros).toEqual([0, 10000, 25000])
    expect(m.durees).toEqual([36, 39, 48, 51, 60, 63])
    expect(m.cellules[0]).toEqual([9.85, 9.7, 9.65])
  })
})

describe('collage depuis Excel', () => {
  it('tableau à tabulations, durées en trimestres (12T) et virgules françaises', () => {
    const texte = 'Montant\t0\t10 000\t25 000\n12T\t9,85%\t9,70%\t9,65%\n21T\t6,05%\t5,95%\t5,85%'
    const r = lireTexteMatrice(texte)
    expect(r.erreurs).toEqual([])
    expect(r.matrice!.durees).toEqual([36, 63])
    expect(r.matrice!.minimumsEuros).toEqual([0, 10000, 25000])
    expect(r.matrice!.cellules[1]).toEqual([6.05, 5.95, 5.85])
  })
  it('CSV à point-virgule, durées en mois', () => {
    const r = lireTexteMatrice('Durée;500;2501\n36;3,17;3,16')
    expect(r.matrice!.cellules).toEqual([[3.17, 3.16]])
  })
  it('signale une ligne incomplète avec son numéro', () => {
    const r = lireTexteMatrice('x\t0\t10000\n12T\t9,85')
    expect(r.erreurs[0]).toContain('Ligne 2')
  })
  it('signale un texte illisible', () => {
    expect(lireTexteMatrice('bonjour').erreurs.length).toBeGreaterThan(0)
  })
})

describe('validation', () => {
  const ok = { minimumsEuros: [0, 100], durees: [36], cellules: [[5, 4]] }
  it('accepte une grille correcte', () => expect(validerMatrice(ok)).toEqual([]))
  it('refuse les minimums non croissants', () => expect(validerMatrice({ ...ok, minimumsEuros: [100, 100] })).not.toEqual([]))
  it('refuse une case vide', () => expect(validerMatrice({ ...ok, cellules: [[5, null]] })).not.toEqual([]))
  it('refuse un coefficient absurde', () => expect(validerMatrice({ ...ok, cellules: [[5, 400]] })).not.toEqual([]))
  it('refuse une durée en double', () => expect(validerMatrice({ ...ok, durees: [36, 36], cellules: [[5, 4], [5, 4]] })).not.toEqual([]))
})
