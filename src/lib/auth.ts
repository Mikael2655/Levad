import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const COOKIE_NAME = 'pronostics_session'
const secretValue = process.env.AUTH_SECRET || 'dev-only-insecure-secret-change-me'
const secret = new TextEncoder().encode(secretValue)

export type Role = 'PLAYER' | 'ADMIN'

export interface SessionPayload {
  playerId: number
  role: Role
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (typeof payload.playerId !== 'number' || typeof payload.role !== 'string') return null
    return { playerId: payload.playerId, role: payload.role as Role }
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export { COOKIE_NAME }
