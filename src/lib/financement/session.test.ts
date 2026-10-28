import { beforeAll, describe, expect, it } from 'vitest'
import { creerJeton, secretConfigure, verifierJeton } from './session'
import { hasher, verifier } from './motdepasse'

beforeAll(() => { process.env.AUTH_SECRET = 'secret-de-test' })

describe('jeton de session', () => {
  it('valide, puis refusé si falsifié (autre utilisateur)', async () => {
    const j = await creerJeton(7)
    expect((await verifierJeton(j))?.utilisateurId).toBe(7)
    const [v, , debut, derniere, sig] = j.split('.')
    expect(await verifierJeton([v, '1', debut, derniere, sig].join('.'))).toBeNull()
  })
  it('expire après 1 h d’inactivité', async () => {
    const j = await creerJeton(7, Date.now() - 2 * 3600_000, Date.now() - 2 * 3600_000)
    expect(await verifierJeton(j)).toBeNull()
  })
  it('refusé sans secret configuré', async () => {
    const j = await creerJeton(7)
    delete process.env.AUTH_SECRET
    delete process.env.APP_PASSWORD
    expect(await verifierJeton(j)).toBeNull()
    process.env.AUTH_SECRET = 'secret-de-test'
  })
})

describe('secret de signature', () => {
  it('détecte l’absence de secret ; la route de connexion répond alors clairement au lieu de planter', async () => {
    const [auth, app] = [process.env.AUTH_SECRET, process.env.APP_PASSWORD]
    delete process.env.AUTH_SECRET
    delete process.env.APP_PASSWORD
    try {
      expect(secretConfigure()).toBe(false)
      process.env.DATABASE_URL ||= 'postgresql://x:x@localhost/x' // jamais interrogée : le secret est contrôlé avant
      const { POST } = await import('@/app/api/financement/connexion/route')
      const res = await POST(new Request('http://x/api/financement/connexion', { method: 'POST', body: JSON.stringify({ email: 'a@b.fr', motDePasse: 'x' }) }))
      expect(res.status).toBe(503)
      const message = (await res.json()).error as string
      expect(message).toContain('AUTH_SECRET')
      expect(message).toContain('Diagnostic')
    } finally {
      process.env.AUTH_SECRET = auth
      if (app !== undefined) process.env.APP_PASSWORD = app
    }
    expect(secretConfigure()).toBe(true)
  })
})

describe('mot de passe', () => {
  it('haché, vérifiable, jamais en clair', async () => {
    const h = await hasher('Mon-Mot-De-Passe')
    expect(h).not.toContain('Mon-Mot')
    expect(await verifier('Mon-Mot-De-Passe', h)).toBe(true)
    expect(await verifier('autre', h)).toBe(false)
  })
})
