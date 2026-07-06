import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'pronostics_session'
const secretValue = process.env.AUTH_SECRET || 'dev-only-insecure-secret-change-me'
const secret = new TextEncoder().encode(secretValue)

export const config = {
  matcher: ['/pronostics/dashboard/:path*', '/pronostics/classement/:path*', '/pronostics/admin/:path*'],
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const loginUrl = new URL('/pronostics/login', request.url)

  if (!token) return NextResponse.redirect(loginUrl)

  try {
    const { payload } = await jwtVerify(token, secret)
    const role = payload.role as string

    if (request.nextUrl.pathname.startsWith('/pronostics/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/pronostics/dashboard', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(loginUrl)
  }
}
