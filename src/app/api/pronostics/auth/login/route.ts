import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const player = await prisma.player.findUnique({ where: { email } })
  if (!player || !(await verifyPassword(password, player.passwordHash))) {
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
  }

  const token = await createSessionToken({ playerId: player.id, role: player.role as 'PLAYER' | 'ADMIN' })
  await setSessionCookie(token)

  return NextResponse.json({ id: player.id, name: player.name, role: player.role })
}
