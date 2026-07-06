import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function GET(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const favorites = await prisma.favorite.findMany({
    where: { playerId: session.playerId },
    select: { favoritePlayerId: true },
  })

  return NextResponse.json(favorites.map((f) => f.favoritePlayerId))
}

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const favoritePlayerId = Number(body?.favoritePlayerId)

  if (favoritePlayerId === session.playerId) {
    return NextResponse.json({ error: 'Tu ne peux pas te mettre toi-même en favori.' }, { status: 400 })
  }

  const target = await prisma.player.findFirst({ where: { id: favoritePlayerId, competitionId } })
  if (!target) return NextResponse.json({ error: 'Joueur introuvable.' }, { status: 404 })

  await prisma.favorite.upsert({
    where: { playerId_favoritePlayerId: { playerId: session.playerId, favoritePlayerId } },
    update: {},
    create: { playerId: session.playerId, favoritePlayerId },
  })

  return NextResponse.json({ ok: true })
}
