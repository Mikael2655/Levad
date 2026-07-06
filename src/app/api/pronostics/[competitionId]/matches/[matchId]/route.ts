import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { recomputeMatchPredictions } from '@/lib/scoring'

export async function PATCH(
  request: Request,
  { params }: { params: { competitionId: string; matchId: string } }
) {
  const competitionId = Number(params.competitionId)
  const matchId = Number(params.matchId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (body?.homeTeam !== undefined) data.homeTeam = body.homeTeam
  if (body?.awayTeam !== undefined) data.awayTeam = body.awayTeam
  if (body?.kickoff !== undefined) data.kickoff = new Date(body.kickoff)
  if (body?.phaseId !== undefined) data.phaseId = Number(body.phaseId)

  for (const key of ['homeScoreFullTime', 'awayScoreFullTime', 'homeScoreExtraTime', 'awayScoreExtraTime'] as const) {
    if (body?.[key] !== undefined) {
      data[key] = body[key] === null || body[key] === '' ? null : Number(body[key])
    }
  }

  if (body?.status !== undefined) {
    if (!['SCHEDULED', 'LIVE', 'FINISHED'].includes(body.status)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
    }
    if (body.status === 'FINISHED') {
      const homeFT = data.homeScoreFullTime !== undefined ? data.homeScoreFullTime : undefined
      const awayFT = data.awayScoreFullTime !== undefined ? data.awayScoreFullTime : undefined
      const current = await prisma.match.findUnique({ where: { id: matchId } })
      const finalHomeFT = homeFT !== undefined ? homeFT : current?.homeScoreFullTime
      const finalAwayFT = awayFT !== undefined ? awayFT : current?.awayScoreFullTime
      if (finalHomeFT === null || finalHomeFT === undefined || finalAwayFT === null || finalAwayFT === undefined) {
        return NextResponse.json({ error: 'Le score à 90 minutes est requis pour clôturer le match.' }, { status: 400 })
      }
    }
    data.status = body.status
  }

  const match = await prisma.match.update({ where: { id: matchId }, data })

  if (match.status === 'FINISHED') {
    await recomputeMatchPredictions(matchId)
  }

  return NextResponse.json(match)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { competitionId: string; matchId: string } }
) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  await prisma.match.delete({ where: { id: Number(params.matchId) } })
  return NextResponse.json({ ok: true })
}
