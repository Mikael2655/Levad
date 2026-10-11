import { NextResponse } from 'next/server'
import { NOM_COOKIE, fabriquerCookie, identifiantValide, motDePasseValide } from '@/lib/connect/auth'

export async function POST(req: Request) {
  const form = await req.formData()
  const saisi = String(form.get('motdepasse') ?? '')
  const identifiant = String(form.get('identifiant') ?? '')
  const base = new URL(req.url)
  if (!(motDePasseValide(saisi) && identifiantValide(identifiant))) {
    await new Promise((r) => setTimeout(r, 800)) // ralentit les essais au hasard
    return NextResponse.redirect(new URL('/parc/connexion?erreur=1', base), 303)
  }
  const rep = NextResponse.redirect(new URL('/parc', base), 303)
  rep.cookies.set(NOM_COOKIE, fabriquerCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600,
  })
  return rep
}
