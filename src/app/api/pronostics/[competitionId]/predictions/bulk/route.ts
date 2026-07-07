import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

// Enregistre en une fois tous les pronostics modifiés. Chaque match est
// validé individuellement (verrouillage au coup d'envoi), les matchs clos
// sont ignorés silencieusement.
export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const entries: Array<{ matchId: number; homeScore: number; awayScore: number }> = Array.isArray(body?.predictions)
    ? body.predictions
    : []

  const now = new Date()
  const matches = await prisma.match.findMany({ where: { competitionId } })
  const matchById = new Map(matches.map((m) => [m.id, m]))

  let saved = 0
  let skipped = 0

  for (const entry of entries) {
    const matchId = Number(entry.matchId)
    const homeScore = Number(entry.homeScore)
    const awayScore = Number(entry.awayScore)

    const match = matchById.get(matchId)
    if (
      !match ||
      match.status !== 'SCHEDULED' ||
      new Date(match.kickoff) <= now ||
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      skipped++
      continue
    }

    await prisma.prediction.upsert({
      where: { playerId_matchId: { playerId: session.playerId, matchId } },
      update: { homeScore, awayScore },
      create: { playerId: session.playerId, matchId, homeScore, awayScore },
    })
    saved++
  }

  return NextResponse.json({ saved, skipped })
}
