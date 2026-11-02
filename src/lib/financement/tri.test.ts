import { describe, expect, it } from 'vitest'
import { lireOrdre, ordreContratsParDefaut, rangContrat, trier } from './tri'

const lignes = [
  { nom: 'élan', n: 10, d: new Date('2026-03-01') },
  { nom: 'Zèbre', n: 2, d: null },
  { nom: 'abeille', n: 100, d: new Date('2025-01-01') },
  { nom: '', n: null as number | null, d: new Date('2027-01-01') },
]
const ext = { nom: (x: typeof lignes[0]) => x.nom, n: (x: typeof lignes[0]) => x.n, d: (x: typeof lignes[0]) => x.d }

describe('tri des listes', () => {
  it('texte : insensible aux accents et aux majuscules, vides à la fin', () => {
    expect(trier(lignes, 'nom', 'asc', ext).map(x => x.nom)).toEqual(['abeille', 'élan', 'Zèbre', ''])
    expect(trier(lignes, 'nom', 'desc', ext).map(x => x.nom)).toEqual(['Zèbre', 'élan', 'abeille', ''])
  })
  it('nombres (2 avant 10 avant 100) et dates, vides toujours à la fin', () => {
    expect(trier(lignes, 'n', 'asc', ext).map(x => x.n)).toEqual([2, 10, 100, null])
    expect(trier(lignes, 'n', 'desc', ext).map(x => x.n)).toEqual([100, 10, 2, null])
    expect(trier(lignes, 'd', 'asc', ext).map(x => x.nom)).toEqual(['abeille', 'élan', '', 'Zèbre'])
  })
  it('colonne inconnue ou absente : ordre inchangé ; sens par défaut croissant', () => {
    expect(trier(lignes, 'zzz', 'asc', ext)).toBe(lignes)
    expect(trier(lignes, undefined, 'asc', ext)).toBe(lignes)
    expect(lireOrdre('desc')).toBe('desc')
    expect(lireOrdre('n’importe quoi')).toBe('asc')
  })
})

describe('ordre par défaut des contrats', () => {
  const d = (s: string) => new Date(`${s}T00:00:00Z`)
  const maintenant = d('2026-11-02')
  const c = (raisonSociale: string, dateFin: string | null, extra: { denonceLe?: string; clotureLe?: string } = {}) => ({ raisonSociale, dateFin: dateFin ? d(dateFin) : null, denonceLe: extra.denonceLe ? d(extra.denonceLe) : null, clotureLe: extra.clotureLe ? d(extra.clotureLe) : null })
  it('échéance dans les 12 mois, puis tacites, puis le reste ; alphabétique dans chaque groupe', () => {
    const l = [
      c('Zèbre SA (échéance dans 3 mois)', '2027-02-01'),
      c('Abeille (dans 2 ans)', '2028-11-01'),
      c('Marcel (tacite)', '2025-06-01'),
      c('Éric (échéance dans 11 mois)', '2027-10-01'),
      c('Bernard (tacite)', '2024-01-01'),
      c('Claire (clôturé)', '2030-01-01', { clotureLe: '2026-01-01' }),
      c('Alpha (dans 13 mois)', '2027-12-15'),
      c('Dédé (sans date)', null),
    ]
    expect(ordreContratsParDefaut(l, maintenant).map(x => x.raisonSociale)).toEqual([
      'Éric (échéance dans 11 mois)', 'Zèbre SA (échéance dans 3 mois)',
      'Bernard (tacite)', 'Marcel (tacite)',
      'Abeille (dans 2 ans)', 'Alpha (dans 13 mois)', 'Claire (clôturé)', 'Dédé (sans date)',
    ])
  })
  it('limite exacte à 12 mois comprise ; un contrat clôturé après son terme ne passe pas devant', () => {
    expect(rangContrat(c('x', '2027-11-02'), maintenant)).toBe(0)
    expect(rangContrat(c('x', '2027-11-03'), maintenant)).toBe(2)
    expect(rangContrat(c('x', '2025-01-01', { denonceLe: '2024-12-01' }), maintenant)).toBe(2) // dénoncé et terminé : clôturé
  })
})
