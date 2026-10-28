import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { certificatEnPem, lireConfigGrenke } from './config'
import { fabriquerCertificats, type JeuCertificats } from './certificats-test.util'

let c: JeuCertificats
let autre: JeuCertificats
const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64')

beforeAll(() => { c = fabriquerCertificats('aaaaaaaa-0000-0000-0000-000000000001'); autre = fabriquerCertificats('bbbbbbbb-0000-0000-0000-000000000002') })
afterAll(() => { c.nettoyer(); autre.nettoyer() })

const env = (o: Record<string, string | undefined> = {}) => ({ GRENKE_API_URL: 'https://api.exemple.test/', GRENKE_CERT_BASE64: b64(c.client.cert), GRENKE_KEY_BASE64: b64(c.client.key), ...o })

describe('configuration Grenke', () => {
  it('variables absentes : liste ce qui manque (noms seulement)', () => {
    expect(lireConfigGrenke({})).toMatchObject({ prete: false, manquantes: ['GRENKE_API_URL', 'GRENKE_CERT_BASE64', 'GRENKE_KEY_BASE64'] })
    expect(lireConfigGrenke(env({ GRENKE_KEY_BASE64: '' })).manquantes).toEqual(['GRENKE_KEY_BASE64'])
  })
  it('certificat PEM : prête, sujet et expiration lus, adresse nettoyée', () => {
    const r = lireConfigGrenke(env())
    expect(r.prete).toBe(true)
    expect(r.config!.urlBase).toBe('https://api.exemple.test')
    expect(r.certificat!.sujet).toContain('aaaaaaaa-0000-0000-0000-000000000001')
    expect(r.certificat!.joursRestants).toBeGreaterThanOrEqual(1)
  })
  it('certificat DER (format du portail Grenke) : converti tout seul en PEM', () => {
    const r = lireConfigGrenke(env({ GRENKE_CERT_BASE64: b64(c.client.certDer) }))
    expect(r.prete).toBe(true)
    expect(certificatEnPem(c.client.certDer)).toContain('BEGIN CERTIFICATE')
  })
  it('clé qui ne correspond pas au certificat : refusée avec une explication', () => {
    const r = lireConfigGrenke(env({ GRENKE_KEY_BASE64: b64(autre.client.key) }))
    expect(r.prete).toBe(false)
    expect(r.problemes.join(' ')).toContain('ne correspond pas')
  })
  it('certificat expiré détecté', () => {
    const r = lireConfigGrenke(env(), new Date(Date.now() + 10 * 86_400_000))
    expect(r.problemes.join(' ')).toContain('expiré')
  })
  it('adresse non https, texte qui n’est pas un certificat, mode de paiement invalide', () => {
    expect(lireConfigGrenke(env({ GRENKE_API_URL: 'http://api.test' })).problemes.join(' ')).toContain('https')
    expect(lireConfigGrenke(env({ GRENKE_CERT_BASE64: b64('n importe quoi') })).problemes.join(' ')).toContain('illisible')
    expect(lireConfigGrenke(env({ GRENKE_PAYMENT_METHOD: 'Cash' })).problemes.join(' ')).toContain('Invoice')
    expect(lireConfigGrenke(env({ GRENKE_PAYMENT_METHOD: 'Direct Debit' })).config?.modePaiement).toBe('Direct Debit')
  })
})
