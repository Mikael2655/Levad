import { describe, expect, it } from 'vitest'
import type { ContratFinanceur } from './connecteurs/connecteur'
import { comparer, normaliserRef, type ExistantContrat } from './synchro-comparaison'

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const existant = (o: Partial<ExistantContrat> = {}): ExistantContrat => ({ id: 1, refFinanceur: '100-61104', raisonSociale: 'ACME', loyerCentimes: 72300, dureeMois: 63, dateDebut: d('2026-01-01'), dateFin: d('2031-04-01'), montantReelCentimes: 1255208, statutFinanceur: 'RunningContract', clotureLe: null, ...o })
const distant = (o: Partial<ContratFinanceur> = {}): ContratFinanceur => ({ reference: '100-61104', etatBrut: 'RunningContract', client: 'ACME', loyerMensuelCentimes: 72300, dureeMois: 63, montantFinanceCentimes: 1255208, dateDebut: d('2026-01-01'), dateFin: d('2031-04-01'), ...o })

describe('comparaison des contrats avec le financeur', () => {
  it('loyer mensuel de Grenke converti dans la période de notre contrat (pas de faux écart)', () => {
    const e = existant({ periodicite: 'TRIMESTRIELLE', loyerCentimes: 216900 })
    expect(comparer([e], [distant({ loyerMensuelCentimes: 72300 })], 'MENSUELLE').ecarts).toEqual([])
    expect(comparer([e], [distant({ loyerMensuelCentimes: 70000 })], 'MENSUELLE').ecarts.map(x => x.champ)).toEqual(['loyer'])
  })
  it('numéros reconnus malgré les espaces, tirets et majuscules : pas de doublon', () => {
    expect(normaliserRef(' a1l-652 43 ')).toBe('A1L65243')
    const r = comparer([existant({ refFinanceur: '100 61104' })], [distant({ reference: '100-61104' })])
    expect(r.nouveaux).toEqual([])
    expect(r.connus).toBe(1)
  })
  it('contrat identique : rien à faire', () => {
    const r = comparer([existant()], [distant()])
    expect(r).toMatchObject({ connus: 1, aRemplir: [], ecarts: [], aCloturer: [], absents: [], nouveaux: [] })
  })
  it('valeurs vides chez nous : remplies ; valeurs différentes : signalées, jamais remplacées', () => {
    const r = comparer([existant({ dateDebut: null, montantReelCentimes: null, dateFin: d('2031-07-01'), loyerCentimes: 70000 })], [distant()])
    expect(r.aRemplir).toHaveLength(1)
    expect(Object.keys(r.aRemplir[0].donnees).sort()).toEqual(['dateDebut', 'montantReelCentimes'])
    expect(r.ecarts.map(e => e.champ).sort()).toEqual(['date de fin', 'loyer'])
    expect(r.aRemplir[0].donnees).not.toHaveProperty('dateFin')
    expect(r.aRemplir[0].donnees).not.toHaveProperty('loyerCentimes')
  })
  it('l’état est toujours mis à jour', () => {
    const r = comparer([existant({ statutFinanceur: 'Defective' })], [distant()])
    expect(r.aRemplir[0].donnees).toEqual({ statutFinanceur: 'RunningContract' })
  })
  it('nouveau contrat : repris ; terminé ou incomplet : laissé de côté avec la raison', () => {
    const r = comparer([], [distant({ reference: 'N1' }), distant({ reference: 'N2', etatBrut: 'Terminated' }), distant({ reference: 'N3', loyerMensuelCentimes: null }), distant({ reference: '' })])
    expect(r.nouveaux.map(n => n.reference)).toEqual(['N1'])
    expect(r.nouveauxIgnores.map(n => n.raison)).toEqual([expect.stringContaining('terminé'), expect.stringContaining('loyer'), expect.stringContaining('numéro')])
  })
  it('contrat terminé chez le financeur : proposé, pas clôturé ; contrat absent : listé seulement', () => {
    const r = comparer([existant(), existant({ id: 2, refFinanceur: 'ZZ-9', raisonSociale: 'Absent' }), existant({ id: 3, refFinanceur: 'CL-1', clotureLe: d('2026-06-01') })], [distant({ etatBrut: 'Terminated' })])
    expect(r.aCloturer.map(x => x.id)).toEqual([1])
    expect(r.absents.map(x => x.id)).toEqual([2]) // le contrat déjà clôturé n'est pas signalé
    expect(r.aRemplir.every(x => !('clotureLe' in x.donnees))).toBe(true)
  })
  it('loyers tous à l’échelle ×3 : avertissement sur l’unité', () => {
    const ex = [1, 2, 3, 4, 5].map(i => existant({ id: i, refFinanceur: `R${i}`, loyerCentimes: 30000 }))
    const di = [1, 2, 3, 4, 5].map(i => distant({ reference: `R${i}`, loyerMensuelCentimes: 10000 }))
    expect(comparer(ex, di).avertissements.join(' ')).toContain('facteur 3')
  })
  it('numéro en double dans la réponse ou dans l’outil : avertissement', () => {
    expect(comparer([existant()], [distant(), distant()]).avertissements.join(' ')).toContain('deux fois')
    expect(comparer([existant(), existant({ id: 2 })], [distant()]).avertissements.join(' ')).toContain('2 fois')
  })
})
