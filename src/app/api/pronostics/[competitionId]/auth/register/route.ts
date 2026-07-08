import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth'
import { MAX_PLAYERS_PER_COMPETITION } from '@/lib/competition'

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  if (!Number.isInteger(competitionId)) {
    return NextResponse.json({ error: 'Compétition invalide.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const name = body?.name?.trim()
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password
  const joinCode = body?.joinCode?.trim().toUpperCase()

  if (!name || !email || !password || password.length < 6 || !joinCode) {
    return NextResponse.json(
      { error: "Nom, email, mot de passe (6 caractères minimum) et code d'accès sont requis." },
      { status: 400 }
    )
  }

  const competition = await prisma.competition.findUnique({ where: { id: competitionId } })
  if (!competition) return NextResponse.json({ error: 'Compétition introuvable.' }, { status: 404 })
  if (competition.joinCode !== joinCode) {
    return NextResponse.json({ error: "Code d'accès incorrect." }, { status: 403 })
  }

  const playerCount = await prisma.player.count({ where: { competitionId } })
  if (playerCount >= MAX_PLAYERS_PER_COMPETITION) {
    return NextResponse.json(
      { error: `Le nombre maximum de joueurs (${MAX_PLAYERS_PER_COMPETITION}) est atteint pour cette compétition.` },
      { status: 403 }
    )
  }

  const existing = await prisma.player.findUnique({ where: { competitionId_email: { competitionId, email } } })
  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email pour cette compétition.' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const player = await prisma.player.create({
    data: { competitionId, name, email, passwordHash, role: 'PLAYER' },
  })

  const token = await createSessionToken({ playerId: player.id, competitionId, role: 'PLAYER' })
  await setSessionCookie(token)

  return NextResponse.json({ id: player.id, name: player.name, role: player.role })
}
