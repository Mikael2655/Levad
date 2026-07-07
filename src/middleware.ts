import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'pronostics_session'
const secretValue = process.env.AUTH_SECRET || 'dev-only-insecure-secret-change-me'
const secret = new TextEncoder().encode(secretValue)

export const config = {
  matcher: [
    '/pronostics/:competitionId/dashboard/:path*',
    '/pronostics/:competitionId/resultats/:path*',
    '/pronostics/:competitionId/classement/:path*',
    '/pronostics/:competitionId/profil/:path*',
    '/pronostics/:competitionId/joueur/:path*',
    '/pronostics/:competitionId/admin/:path*',
  ],
}

export async function middleware(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean) // ["pronostics", "<id>", "dashboard", ...]
  const competitionId = Number(segments[1])
  const loginUrl = new URL(`/pronostics/${segments[1]}/login`, request.url)

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.redirect(loginUrl)

  try {
    const { payload } = await jwtVerify(token, secret)
    const role = payload.role as string
    const sessionCompetitionId = payload.competitionId as number

    if (sessionCompetitionId !== competitionId) {
      return NextResponse.redirect(loginUrl)
    }

    if (segments[2] === 'admin' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/pronostics/${competitionId}/dashboard`, request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(loginUrl)
  }
}
