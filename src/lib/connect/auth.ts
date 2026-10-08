import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

// Accès au tableau de bord par un mot de passe unique (variable Vercel PARC_PASSWORD).
// Après connexion, un cookie signé (valable 30 jours) prouve que le mot de passe a été saisi.

export const NOM_COOKIE = 'levad_parc'
const DUREE_MS = 30 * 24 * 3600 * 1000

function signer(valeur: string, motDePasse: string) {
  return createHmac('sha256', 'levad-connect|' + motDePasse).update(valeur).digest('hex')
}

export function motDePasseConfigure(): string | null {
  return process.env.PARC_PASSWORD || null
}

export function motDePasseValide(saisi: string): boolean {
  const attendu = motDePasseConfigure()
  if (!attendu) return false
  const a = Buffer.from(saisi)
  const b = Buffer.from(attendu)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function fabriquerCookie(): string {
  const mdp = motDePasseConfigure() ?? ''
  const exp = String(Date.now() + DUREE_MS)
  return `${exp}.${signer(exp, mdp)}`
}

export function connecte(): boolean {
  const mdp = motDePasseConfigure()
  if (!mdp) return false
  const valeur = cookies().get(NOM_COOKIE)?.value
  if (!valeur) return false
  const [exp, signature] = valeur.split('.')
  if (!exp || !signature || Number(exp) < Date.now()) return false
  const attendu = signer(exp, mdp)
  const a = Buffer.from(signature)
  const b = Buffer.from(attendu)
  return a.length === b.length && timingSafeEqual(a, b)
}
