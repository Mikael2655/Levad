import { NextResponse } from 'next/server'
import { changerMotDePasse } from '@/lib/financement/admin'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { SESSION_FIN_COOKIE, creerJeton, optionsCookieFin } from '@/lib/financement/session'

// Changement de MON mot de passe. Les autres sessions ouvertes sont invalidées ; celle-ci reçoit un nouveau jeton.
export async function POST(req: Request) {
  const u = await acteurApi({ autoriserChangementMdp: true })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  const res = await repondre(() => changerMotDePasse(u.id, String(c.ancien ?? ''), String(c.nouveau ?? '')).then(() => ({ ok: true })))
  if (res.ok) res.cookies.set(SESSION_FIN_COOKIE, await creerJeton(u.id), optionsCookieFin)
  return res
}
