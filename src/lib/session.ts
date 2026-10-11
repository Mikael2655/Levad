import { IDLE_TIMEOUT_MS, MAX_SESSION_MS, SESSION_COOKIE } from '@/lib/auth-constants'

// Utilise uniquement Web Crypto : fonctionne dans le middleware (Edge) et dans les routes (Node).
const encoder = new TextEncoder()

function secret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || ''
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Identifiant : variable APP_USERNAME, "levad" par défaut. Les deux comparaisons sont toujours faites
// (pas de sortie anticipée) pour ne pas révéler lequel des deux champs est faux.
export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const expectedPassword = process.env.APP_PASSWORD
  if (!expectedPassword) return false
  const expectedUser = (process.env.APP_USERNAME || 'levad').trim().toLowerCase()
  const [u1, u2, p1, p2] = await Promise.all([
    hmac(`user.${username.trim().toLowerCase()}`),
    hmac(`user.${expectedUser}`),
    hmac(`pw.${password}`),
    hmac(`pw.${expectedPassword}`),
  ])
  const userOk = safeEqual(u1, u2)
  const passOk = safeEqual(p1, p2)
  return userOk && passOk
}

// Jeton : "<début>.<dernière activité>.<signature>"
export async function createToken(started = Date.now(), last = Date.now()): Promise<string> {
  return `${started}.${last}.${await hmac(`v1.${started}.${last}`)}`
}

export async function verifyToken(token: string, now = Date.now()): Promise<{ started: number; last: number } | null> {
  if (!secret()) return null
  const [startedStr, lastStr, sig] = token.split('.')
  const started = Number(startedStr)
  const last = Number(lastStr)
  if (!Number.isFinite(started) || !Number.isFinite(last) || !sig) return null
  if (!safeEqual(sig, await hmac(`v1.${started}.${last}`))) return null
  if (now - last > IDLE_TIMEOUT_MS || now - started > MAX_SESSION_MS) return null
  return { started, last }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: IDLE_TIMEOUT_MS / 1000,
}

export { SESSION_COOKIE }
