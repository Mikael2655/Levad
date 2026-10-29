import { describe, expect, it } from 'vitest'
import { dureeTrimestres, loyerPeriode, materielAffiche } from './format'

describe('affichage des listes', () => {
  it('matériel : la quantité n\'apparaît que si elle dépasse 1', () => {
    expect(materielAffiche('1 × Copieur (Canon)')).toBe('Copieur (Canon)')
    expect(materielAffiche('1 × Copieur (Canon) ; 2 × Écran ; 1 × Maintenance')).toBe('Copieur (Canon) ; 2 × Écran ; Maintenance')
    expect(materielAffiche('11 × Câble')).toBe('11 × Câble')
  })
  it('durée en trimestres, loyer avec T ou M', () => {
    expect(dureeTrimestres(63)).toBe('21 T')
    expect(dureeTrimestres(10)).toBe('10 mois')
    expect(loyerPeriode(72300, 'TRIMESTRIELLE')).toMatch(/723,00.€ \/ T$/)
    expect(loyerPeriode(10000, 'MENSUELLE')).toMatch(/100,00.€ \/ M$/)
  })
})
