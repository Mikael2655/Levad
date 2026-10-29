import { describe, expect, it } from 'vitest'
import { lireOrdre, trier } from './tri'

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
