import { NextResponse } from 'next/server'
import { SESSION_FIN_COOKIE } from '@/lib/financement/session'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_FIN_COOKIE)
  return res
}
