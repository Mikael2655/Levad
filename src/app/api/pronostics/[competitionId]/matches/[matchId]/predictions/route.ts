import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

// Les pronostics de tous les joueurs pour un match ne sont visibles
// (par tout le monde, admin compris) qu'une fois le coup d'envoi passé.
export async function GET(
  _request: Request,
  { params }: { params: { competitionId: string; matchId: string } }
) {
  const competitionId = Number(params.competitionId)
  const matchId = Number(params.matchId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const match = await prisma.match.findFirst({ where: { id: matchId, competitionId } })
  if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })

  const started = match.status !== 'SCHEDULED' || new Date(match.kickoff) <= new Date()
  if (!started) {
    return NextResponse.json({ error: 'Ce match n\'a pas encore commencé.' }, { status: 403 })
  }

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { player: { select: { id: true, name: true } } },
    orderBy: { player: { name: 'asc' } },
  })

  return NextResponse.json(
    predictions.map((p) => ({
      playerId: p.player.id,
      playerName: p.player.name,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      points: p.points,
    }))
  )
}
