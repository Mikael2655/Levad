export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, checkPassword, createToken, sessionCookieOptions } from '@/lib/session'

// Limite les essais par adresse IP (par instance serverless : frein simple contre l'essai en boucle).
const failures = new Map<string, { count: number; first: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

export async function POST(req: NextRequest) {
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json({ error: 'APP_PASSWORD n\'est pas configuré sur le serveur' }, { status: 500 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'inconnu'
  const now = Date.now()
  const entry = failures.get(ip)
  if (entry && now - entry.first > WINDOW_MS) failures.delete(ip)
  const current = failures.get(ip)
  if (current && current.count >= MAX_FAILURES) {
    return NextResponse.json({ error: 'Trop d\'essais, réessayez dans 15 minutes' }, { status: 429 })
  }

  let password = ''
  try {
    password = String((await req.json()).password ?? '')
  } catch { /* corps invalide */ }

  if (!(await checkPassword(password))) {
    failures.set(ip, { count: (current?.count ?? 0) + 1, first: current?.first ?? now })
    await new Promise(r => setTimeout(r, 800))
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  failures.delete(ip)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await createToken(), sessionCookieOptions)
  return res
}
