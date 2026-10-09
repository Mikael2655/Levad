import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, createToken, sessionCookieOptions, verifyToken } from '@/lib/session'

// 1) Adresse destinée aux clients (connect.levad.fr) : on n'y expose QUE la page de téléchargement,
// les fichiers à télécharger, l'adresse de réception des relevés et le suivi du parc (protégé par mot de passe). Tout le reste (en particulier
// l'outil de publications) y répond « introuvable ». Les autres adresses ne changent pas.
//
// 2) Outil social (autres adresses) : accès par mot de passe, session de 1 h d'inactivité.
// Restent publics : /login, /telecharger, /api/releve, /api/cron/* (protégés par CRON_SECRET).

const FICHIERS_AUTORISES = ['/levad-logo.png', '/icon.png', '/apple-touch-icon.png', '/signature-levad.png', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest', '/favicon.ico', '/api/releve']

function estProtege(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/social' || pathname.startsWith('/social/') ||
    pathname.startsWith('/api/social/') ||
    pathname.startsWith('/api/auth/linkedin/') ||
    pathname === '/api/auth/ping'
  )
}

export async function middleware(req: NextRequest) {
  const hote = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').toLowerCase()
  const { pathname } = req.nextUrl

  if (hote.startsWith('connect.')) {
    if (pathname === '/') return NextResponse.rewrite(new URL('/telecharger', req.url))

    const autorise =
      pathname === '/telecharger' ||
      pathname.startsWith('/telecharger/') ||
      pathname.startsWith('/api/agent/') ||
      pathname.startsWith('/telechargements/') ||
      pathname.startsWith('/parc') ||
      pathname.startsWith('/api/parc/') ||
      pathname.startsWith('/_next/') ||
      FICHIERS_AUTORISES.includes(pathname)
    if (autorise) return NextResponse.next()

    return new NextResponse('Introuvable', { status: 404 })
  }

  if (!estProtege(pathname)) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifyToken(token) : null

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    const next = pathname + req.nextUrl.search
    url.pathname = '/login'
    url.search = ''
    if (next !== '/') url.searchParams.set('next', next)
    const res = NextResponse.redirect(url)
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  const res = NextResponse.next()
  if (Date.now() - session.last > 30_000) {
    res.cookies.set(SESSION_COOKIE, await createToken(session.started), sessionCookieOptions)
  }
  return res
}
