import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { getLeaderboard } from '@/lib/scoring'

export async function GET(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const favorisOnly = new URL(request.url).searchParams.get('favoris') === '1'

  if (!favorisOnly) {
    return NextResponse.json(await getLeaderboard(competitionId))
  }

  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const favorites = await prisma.favorite.findMany({
    where: { playerId: session.playerId },
    select: { favoritePlayerId: true },
  })
  const playerIds = [session.playerId, ...favorites.map((f) => f.favoritePlayerId)]

  return NextResponse.json(await getLeaderboard(competitionId, playerIds))
}
