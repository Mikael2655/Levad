import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, createToken, sessionCookieOptions, verifyToken } from '@/lib/session'
import { SESSION_FIN_COOKIE, creerJeton, optionsCookieFin, verifierJeton } from '@/lib/financement/session'

// 1) Adresse destinée aux clients (connect.levad.fr) : on n'y expose QUE la page de téléchargement,
// les fichiers à télécharger, l'adresse de réception des relevés et le suivi du parc (protégé par mot de passe). Tout le reste (en particulier
// l'outil de publications) y répond « introuvable ». Les autres adresses ne changent pas.
//
// 2) Outil social (autres adresses) : accès par mot de passe, session de 1 h d'inactivité.
// Restent publics : /login, /telecharger, /api/releve, /api/cron/* (protégés par CRON_SECRET).

const FICHIERS_AUTORISES = ['/levad-logo.png', '/icon.png', '/signature-levad.png', '/connect-manifest.webmanifest', '/favicon.ico', '/api/releve']

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
      pathname.startsWith('/icons/connect-') ||
      pathname.startsWith('/aide/') ||
      pathname.startsWith('/espace/') ||
      pathname.startsWith('/parc') ||
      pathname.startsWith('/api/parc/') ||
      pathname.startsWith('/_next/') ||
      FICHIERS_AUTORISES.includes(pathname)
    if (autorise) return NextResponse.next()

    return new NextResponse('Introuvable', { status: 404 })
  }

  // Outil de financement : comptes individuels (cookie propre). Le middleware ne vérifie que la signature du jeton ;
  // l'utilisateur et son rôle sont relus en base par chaque page / route (voir lib/financement/auth.ts).
  if (pathname === '/financement' || pathname.startsWith('/financement/') || pathname.startsWith('/api/financement/')) {
    if (['/financement/connexion', '/api/financement/connexion', '/financement/installation', '/api/financement/installation'].includes(pathname)) return NextResponse.next()
    const jeton = req.cookies.get(SESSION_FIN_COOKIE)?.value
    const sessionFin = jeton ? await verifierJeton(jeton) : null
    if (!sessionFin) {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
      const url = req.nextUrl.clone()
      const suite = pathname + req.nextUrl.search
      url.pathname = '/financement/connexion'
      url.search = ''
      if (suite !== '/financement') url.searchParams.set('suite', suite)
      const res = NextResponse.redirect(url)
      res.cookies.delete(SESSION_FIN_COOKIE)
      return res
    }
    const res = NextResponse.next()
    if (Date.now() - sessionFin.derniere > 30_000) {
      res.cookies.set(SESSION_FIN_COOKIE, await creerJeton(sessionFin.utilisateurId, sessionFin.debut), optionsCookieFin)
    }
    return res
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
