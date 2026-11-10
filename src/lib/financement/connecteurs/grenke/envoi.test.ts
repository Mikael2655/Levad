import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ prisma: {} })) // les garde-fous testés ici refusent avant tout accès à la base
import { modeEcriture } from './connecteur'
import { envoyerDemandeAGrenke } from './envoi'

describe('mode d’écriture vers Grenke', () => {
  it('fermé par défaut', () => {
    expect(modeEcriture({})).toEqual({ mode: 'ferme', sirenTest: null })
    expect(modeEcriture({ GRENKE_ECRITURE: 'peut-etre' }).mode).toBe('ferme')
  })
  it('essai : exige un SIREN de test valide, sinon reste fermé', () => {
    expect(modeEcriture({ GRENKE_ECRITURE: 'test' }).mode).toBe('ferme')
    expect(modeEcriture({ GRENKE_ECRITURE: 'test', GRENKE_SIREN_TEST: '123' }).mode).toBe('ferme')
    expect(modeEcriture({ GRENKE_ECRITURE: 'test', GRENKE_SIREN_TEST: '123 456 789' })).toEqual({ mode: 'test', sirenTest: '123456789' })
  })
  it('ouvert seulement avec « oui »', () => {
    expect(modeEcriture({ GRENKE_ECRITURE: 'OUI' }).mode).toBe('ouvert')
  })
})

describe('envoi d’une demande à Grenke : garde-fous', () => {
  const ancien = process.env.GRENKE_ECRITURE
  afterEach(() => { if (ancien === undefined) delete process.env.GRENKE_ECRITURE; else process.env.GRENKE_ECRITURE = ancien })
  it('refusé à un non-administrateur', async () => {
    await expect(envoyerDemandeAGrenke({ id: 1, role: 'ASSISTANTE' }, 1)).rejects.toMatchObject({ status: 403 })
    await expect(envoyerDemandeAGrenke({ id: 1, role: 'COMMERCIAL' }, 1)).rejects.toMatchObject({ status: 403 })
  })
  it('refusé tant que l’écriture est fermée, même pour l’administrateur', async () => {
    delete process.env.GRENKE_ECRITURE
    await expect(envoyerDemandeAGrenke({ id: 1, role: 'ADMIN' }, 1)).rejects.toThrow(/fermé/)
  })
})
