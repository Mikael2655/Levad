import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth'
import { MAX_PLAYERS } from '@/lib/scoring'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const name = body?.name?.trim()
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!name || !email || !password || password.length < 6) {
    return NextResponse.json(
      { error: 'Nom, email et mot de passe (6 caractères minimum) sont requis.' },
      { status: 400 }
    )
  }

  const playerCount = await prisma.player.count()
  if (playerCount >= MAX_PLAYERS) {
    return NextResponse.json(
      { error: `Le nombre maximum de joueurs (${MAX_PLAYERS}) est atteint.` },
      { status: 403 }
    )
  }

  const existing = await prisma.player.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const role = playerCount === 0 ? 'ADMIN' : 'PLAYER'

  const player = await prisma.player.create({
    data: { name, email, passwordHash, role },
  })

  const token = await createSessionToken({ playerId: player.id, role: player.role as 'PLAYER' | 'ADMIN' })
  await setSessionCookie(token)

  return NextResponse.json({ id: player.id, name: player.name, role: player.role })
}
