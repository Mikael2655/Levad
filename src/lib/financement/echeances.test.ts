import { describe, expect, it } from 'vitest'
import { ajouterMois, dateFinDepuisDebut, etatEcheance, moisRestants } from './echeances'

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const iso = (x: Date) => x.toISOString().slice(0, 10)
const maintenant = d('2026-10-28')

describe('dates', () => {
  it('ajoute des mois sans déborder', () => {
    expect(iso(ajouterMois(d('2026-01-31'), 1))).toBe('2026-02-28')
    expect(iso(ajouterMois(d('2028-01-31'), 1))).toBe('2028-02-29')
    expect(iso(ajouterMois(d('2026-11-15'), 3))).toBe('2027-02-15')
    expect(iso(ajouterMois(d('2026-10-28'), 6))).toBe('2027-04-28')
  })
  it('fin = 1er loyer + durée', () => {
    expect(iso(dateFinDepuisDebut(d('2026-01-01'), 63))).toBe('2031-04-01')
  })
})

describe('mois restants (mois complets)', () => {
  it('compte les mois entiers', () => {
    expect(moisRestants(d('2026-12-31'), maintenant)).toBe(2)
    expect(moisRestants(d('2026-12-28'), maintenant)).toBe(2)
    expect(moisRestants(d('2026-12-27'), maintenant)).toBe(1)
    expect(moisRestants(d('2027-10-28'), maintenant)).toBe(12)
  })
  it('0 si échu, null si date inconnue', () => {
    expect(moisRestants(d('2026-10-01'), maintenant)).toBe(0)
    expect(moisRestants(null, maintenant)).toBeNull()
  })
})

describe('alerte d’échéance (6 mois)', () => {
  it('proche / en cours / échu / inconnue', () => {
    expect(etatEcheance(d('2027-04-28'), maintenant)).toBe('PROCHE') // pile 6 mois
    expect(etatEcheance(d('2027-04-29'), maintenant)).toBe('EN_COURS')
    expect(etatEcheance(d('2026-11-30'), maintenant)).toBe('PROCHE')
    expect(etatEcheance(d('2026-10-27'), maintenant)).toBe('ECHU')
    expect(etatEcheance(null, maintenant)).toBe('INCONNUE')
  })
})
