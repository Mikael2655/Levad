import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function GET(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const matches = await prisma.match.findMany({
    where: { competitionId },
    orderBy: { kickoff: 'asc' },
    include: { phase: { select: { id: true, name: true, allowsExtraTime: true } } },
  })
  return NextResponse.json(matches)
}

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const homeTeam = body?.homeTeam?.trim()
  const awayTeam = body?.awayTeam?.trim()
  const kickoff = body?.kickoff
  const phaseId = Number(body?.phaseId)

  if (!homeTeam || !awayTeam || !kickoff || !phaseId) {
    return NextResponse.json({ error: 'Équipes, date/heure et phase du match sont requises.' }, { status: 400 })
  }

  const phase = await prisma.phase.findFirst({ where: { id: phaseId, competitionId } })
  if (!phase) return NextResponse.json({ error: 'Phase introuvable.' }, { status: 404 })

  const match = await prisma.match.create({
    data: { competitionId, phaseId, homeTeam, awayTeam, kickoff: new Date(kickoff) },
  })

  return NextResponse.json(match, { status: 201 })
}
