import { NextResponse, type NextRequest } from 'next/server'

// Adresse destinée aux clients (connect.levad.fr) : on n'y expose QUE la page de téléchargement,
// les fichiers à télécharger et l'adresse de réception des relevés. Tout le reste (en particulier
// l'outil de publications) y répond « introuvable ». Les autres adresses ne changent pas.

const FICHIERS_AUTORISES = ['/levad-logo.png', '/icon.png', '/favicon.ico', '/api/releve']

export function middleware(req: NextRequest) {
  const hote = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').toLowerCase()
  if (!hote.startsWith('connect.')) return NextResponse.next()

  const { pathname } = req.nextUrl
  if (pathname === '/') return NextResponse.rewrite(new URL('/telecharger', req.url))

  const autorise =
    pathname === '/telecharger' ||
    pathname.startsWith('/telechargements/') ||
    pathname.startsWith('/_next/') ||
    FICHIERS_AUTORISES.includes(pathname)
  if (autorise) return NextResponse.next()

  return new NextResponse('Introuvable', { status: 404 })
}
