import { NextResponse } from 'next/server'
import { NOM_COOKIE } from '@/lib/connect/auth'

export async function POST(req: Request) {
  const rep = NextResponse.redirect(new URL('/parc/connexion', req.url), 303)
  rep.cookies.delete(NOM_COOKIE)
  return rep
}
