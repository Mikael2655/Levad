import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function GET(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const phases = await prisma.phase.findMany({ where: { competitionId }, orderBy: { order: 'asc' } })
  return NextResponse.json(phases)
}

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const name = body?.name?.trim()
  const order = Number.isInteger(body?.order) ? body.order : 0
  const pointsExactScore = Number.isInteger(body?.pointsExactScore) ? body.pointsExactScore : 5
  const pointsGoalDifference = Number.isInteger(body?.pointsGoalDifference) ? body.pointsGoalDifference : 3
  const pointsCorrectOutcome = Number.isInteger(body?.pointsCorrectOutcome) ? body.pointsCorrectOutcome : 1
  const allowsExtraTime = Boolean(body?.allowsExtraTime)

  if (!name) {
    return NextResponse.json({ error: 'Le nom de la phase est requis.' }, { status: 400 })
  }

  const phase = await prisma.phase.create({
    data: {
      competitionId,
      name,
      order,
      pointsExactScore,
      pointsGoalDifference,
      pointsCorrectOutcome,
      allowsExtraTime,
    },
  })

  return NextResponse.json(phase, { status: 201 })
}
