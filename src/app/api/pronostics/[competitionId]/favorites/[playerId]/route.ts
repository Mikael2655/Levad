import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: { competitionId: string; playerId: string } }
) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  await prisma.favorite.deleteMany({
    where: { playerId: session.playerId, favoritePlayerId: Number(params.playerId) },
  })

  return NextResponse.json({ ok: true })
}
