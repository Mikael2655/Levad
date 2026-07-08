import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  if (!Number.isInteger(competitionId)) {
    return NextResponse.json({ error: 'Compétition invalide.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const player = await prisma.player.findUnique({ where: { competitionId_email: { competitionId, email } } })
  if (!player || !(await verifyPassword(password, player.passwordHash))) {
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 })
  }

  const token = await createSessionToken({ playerId: player.id, competitionId, role: player.role as 'PLAYER' | 'ADMIN' })
  await setSessionCookie(token)

  return NextResponse.json({ id: player.id, name: player.name, role: player.role })
}
