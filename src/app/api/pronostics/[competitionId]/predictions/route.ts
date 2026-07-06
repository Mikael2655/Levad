import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function GET(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const predictions = await prisma.prediction.findMany({ where: { playerId: session.playerId } })
  return NextResponse.json(predictions)
}

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const matchId = Number(body?.matchId)
  const homeScore = Number(body?.homeScore)
  const awayScore = Number(body?.awayScore)

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: 'Scores invalides.' }, { status: 400 })
  }

  const match = await prisma.match.findFirst({ where: { id: matchId, competitionId } })
  if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })
  if (match.status !== 'SCHEDULED' || new Date(match.kickoff) <= new Date()) {
    return NextResponse.json({ error: 'Le pronostic pour ce match est clos.' }, { status: 403 })
  }

  const prediction = await prisma.prediction.upsert({
    where: { playerId_matchId: { playerId: session.playerId, matchId } },
    update: { homeScore, awayScore },
    create: { playerId: session.playerId, matchId, homeScore, awayScore },
  })

  return NextResponse.json(prediction)
}
