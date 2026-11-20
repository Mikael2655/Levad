import { describe, expect, it } from 'vitest'
import { numeroAffiche } from './numero'

describe('numéro de demande affiché', () => {
  const grenke = { envoiParMail: false }
  const solubail = { envoiParMail: true }
  it('numéro du financeur quand il existe (Grenke : 100-145711)', () => {
    expect(numeroAffiche({ reference: 'LEV-2026-0003', refFinanceur: '100-145711' }, grenke)).toBe('100-145711')
  })
  it('référence interne tant qu’il n’y a pas de numéro : avant envoi, envoi en cours, identifiant technique pas encore remplacé', () => {
    expect(numeroAffiche({ reference: 'LEV-2026-0003', refFinanceur: null }, grenke)).toBe('LEV-2026-0003')
    expect(numeroAffiche({ reference: 'LEV-2026-0003', refFinanceur: 'ENVOI-EN-COURS' }, grenke)).toBe('LEV-2026-0003')
    expect(numeroAffiche({ reference: 'LEV-2026-0003', refFinanceur: '1d2bdc17-2979-4c72-9cb3-9b0dca272d7a' }, grenke)).toBe('LEV-2026-0003')
    expect(numeroAffiche({ reference: 'LEV-2026-0003', refFinanceur: '  ' }, grenke)).toBe('LEV-2026-0003')
  })
  it('financeur par e-mail (Solubail) : référence interne conservée, c’est celle des échanges', () => {
    expect(numeroAffiche({ reference: 'LEV-2026-0007', refFinanceur: '75815IB' }, solubail)).toBe('LEV-2026-0007')
  })
})
