// Session de l'outil de financement. Jeton signé « fin1.<id utilisateur>.<début>.<dernière activité>.<signature> ».
// Web Crypto uniquement (fonctionne dans le middleware et dans les routes). Le rôle n'est PAS dans le jeton :
// il est relu en base à chaque requête, donc un changement de rôle ou une désactivation agit immédiatement.
import { IDLE_TIMEOUT_MS, MAX_SESSION_MS } from '@/lib/auth-constants'

export const SESSION_FIN_COOKIE = 'levad_fin'
const encoder = new TextEncoder()

function secret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || ''
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function creerJeton(utilisateurId: number, debut = Date.now(), derniere = Date.now()): Promise<string> {
  return `fin1.${utilisateurId}.${debut}.${derniere}.${await hmac(`fin1.${utilisateurId}.${debut}.${derniere}`)}`
}

export async function verifierJeton(jeton: string, maintenant = Date.now()): Promise<{ utilisateurId: number; debut: number; derniere: number } | null> {
  if (!secret()) return null
  const [v, idStr, debutStr, derniereStr, sig] = jeton.split('.')
  const utilisateurId = Number(idStr)
  const debut = Number(debutStr)
  const derniere = Number(derniereStr)
  if (v !== 'fin1' || !sig || !Number.isInteger(utilisateurId) || !Number.isFinite(debut) || !Number.isFinite(derniere)) return null
  if (!egal(sig, await hmac(`fin1.${utilisateurId}.${debut}.${derniere}`))) return null
  if (maintenant - derniere > IDLE_TIMEOUT_MS || maintenant - debut > MAX_SESSION_MS) return null
  return { utilisateurId, debut, derniere }
}

export const optionsCookieFin = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: IDLE_TIMEOUT_MS / 1000,
}
