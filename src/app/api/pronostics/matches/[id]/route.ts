import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recomputeMatchPredictions } from '@/lib/scoring'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const matchId = Number(params.id)
  const body = await request.json().catch(() => null)
  const { homeTeam, awayTeam, kickoff, homeScore, awayScore } = body ?? {}

  const data: Record<string, unknown> = {}
  if (homeTeam !== undefined) data.homeTeam = homeTeam
  if (awayTeam !== undefined) data.awayTeam = awayTeam
  if (kickoff !== undefined) data.kickoff = new Date(kickoff)

  if (homeScore !== undefined && awayScore !== undefined) {
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      return NextResponse.json({ error: 'Scores invalides.' }, { status: 400 })
    }
    data.homeScore = homeScore
    data.awayScore = awayScore
    data.status = 'FINISHED'
  }

  const match = await prisma.match.update({ where: { id: matchId }, data })

  if (match.status === 'FINISHED') {
    await recomputeMatchPredictions(matchId)
  }

  return NextResponse.json(match)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  await prisma.match.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
