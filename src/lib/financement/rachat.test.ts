import { describe, expect, it } from 'vitest'
import { dernierLoyer, prochaineReconduction, statutContrat } from './echeances'
import { simulerRachat } from './rachat'

const d = (s: string) => new Date(`${s}T00:00:00Z`)

describe('statut du contrat', () => {
  const base = { dateFin: d('2027-03-01'), denonceLe: null, clotureLe: null }
  it('en cours avant le terme, tacite après le terme sans dénonciation, clôturé si dénoncé', () => {
    expect(statutContrat(base, d('2026-10-29'))).toBe('EN_COURS')
    expect(statutContrat(base, d('2027-03-02'))).toBe('TACITE')
    expect(statutContrat({ ...base, denonceLe: d('2026-12-01') }, d('2026-12-02'))).toBe('EN_COURS') // dénoncé : s'arrête au terme
    expect(statutContrat({ ...base, denonceLe: d('2026-12-01') }, d('2027-03-02'))).toBe('CLOTURE')
  })
  it('dénoncé pendant la reconduction tacite : reste tacite jusqu\'à l\'anniversaire, puis clôturé', () => {
    const c = { dateFin: d('2027-03-01'), denonceLe: d('2027-06-01'), clotureLe: null }
    expect(statutContrat(c, d('2027-09-01'))).toBe('TACITE')
    expect(statutContrat(c, d('2028-03-02'))).toBe('CLOTURE')
  })
  it('un contrat soldé est clôturé ; sans date de fin il reste en cours', () => {
    expect(statutContrat({ ...base, clotureLe: d('2026-06-01') }, d('2026-10-29'))).toBe('CLOTURE')
    expect(statutContrat({ dateFin: null, denonceLe: null, clotureLe: null })).toBe('EN_COURS')
  })
  it('dernier loyer = fin - une période ; reconduction tacite : fin + 1 an, + 2 ans...', () => {
    expect(dernierLoyer(d('2032-03-01'), 'TRIMESTRIELLE')).toEqual(d('2031-12-01'))
    expect(dernierLoyer(d('2032-03-01'), 'MENSUELLE')).toEqual(d('2032-02-01'))
    expect(dernierLoyer(null, 'MENSUELLE')).toBeNull()
    expect(prochaineReconduction(d('2027-03-01'), d('2027-04-01'))).toEqual(d('2028-03-01'))
    expect(prochaineReconduction(d('2027-03-01'), d('2029-01-01'))).toEqual(d('2029-03-01'))
  })
})

describe('solde anticipé (règle Grenke)', () => {
  // 21 trimestres de 723 € à partir du 1er janvier 2026, montant financé réel 12 552,08 €
  const e = { loyerCentimes: 72300, periodicite: 'TRIMESTRIELLE', dureeMois: 63, dateDebut: d('2026-01-01'), montantReelCentimes: 1255208 }
  it('renouvelant : loyers restants + VR de 1 % du montant financé réel', () => {
    // loyers au 1/1, 1/4, 1/7, 1/10 de chaque année : résiliation au 2026-10-15 -> 21 - 4 = 17 loyers restants
    const r = simulerRachat({ ...e, type: 'RENOUVELANT', dateResiliation: d('2026-10-15') })
    expect(r).toEqual({ nbLoyersRestants: 17, loyersRestantsCentimes: 17 * 72300, penaliteCentimes: 0, valeurResiduelleCentimes: 12552, totalCentimes: 17 * 72300 + 12552 })
  })
  it('non renouvelant : + 10 % des loyers restants', () => {
    const r = simulerRachat({ ...e, type: 'NON_RENOUVELANT', dateResiliation: d('2026-10-15') })
    expect(r.penaliteCentimes).toBe(Math.round(17 * 72300 * 0.1))
    expect(r.totalCentimes).toBe(17 * 72300 + Math.round(17 * 72300 * 0.1) + 12552)
  })
  it('un loyer à la date exacte de résiliation est considéré payé', () => {
    expect(simulerRachat({ ...e, type: 'RENOUVELANT', dateResiliation: d('2026-10-01') }).nbLoyersRestants).toBe(17)
    expect(simulerRachat({ ...e, type: 'RENOUVELANT', dateResiliation: d('2026-09-30') }).nbLoyersRestants).toBe(18)
  })
  it('mensuel : un loyer par mois ; terme dépassé : plus de loyer restant, reste la VR', () => {
    const m = simulerRachat({ ...e, periodicite: 'MENSUELLE', dureeMois: 12, loyerCentimes: 10000, type: 'RENOUVELANT', dateResiliation: d('2026-06-15') })
    expect(m.nbLoyersRestants).toBe(6) // juillet à décembre
    expect(simulerRachat({ ...e, type: 'NON_RENOUVELANT', dateResiliation: d('2040-01-01') })).toMatchObject({ nbLoyersRestants: 0, penaliteCentimes: 0, totalCentimes: 12552 })
  })
  it('type inconnu refusé', () => {
    expect(() => simulerRachat({ ...e, type: 'AUTRE' as never, dateResiliation: d('2026-10-15') })).toThrow('Type de solde')
  })
})
