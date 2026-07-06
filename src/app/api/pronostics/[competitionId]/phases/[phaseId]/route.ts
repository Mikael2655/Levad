import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { recomputePhaseMatches } from '@/lib/scoring'

export async function PATCH(
  request: Request,
  { params }: { params: { competitionId: string; phaseId: string } }
) {
  const competitionId = Number(params.competitionId)
  const phaseId = Number(params.phaseId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (body?.name !== undefined) data.name = body.name
  if (body?.order !== undefined) data.order = Number(body.order)
  if (body?.pointsExactScore !== undefined) data.pointsExactScore = Number(body.pointsExactScore)
  if (body?.pointsGoalDifference !== undefined) data.pointsGoalDifference = Number(body.pointsGoalDifference)
  if (body?.pointsCorrectOutcome !== undefined) data.pointsCorrectOutcome = Number(body.pointsCorrectOutcome)
  if (body?.allowsExtraTime !== undefined) data.allowsExtraTime = Boolean(body.allowsExtraTime)

  const phase = await prisma.phase.update({ where: { id: phaseId }, data })

  if (
    body?.pointsExactScore !== undefined ||
    body?.pointsGoalDifference !== undefined ||
    body?.pointsCorrectOutcome !== undefined
  ) {
    await recomputePhaseMatches(phaseId)
  }

  return NextResponse.json(phase)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { competitionId: string; phaseId: string } }
) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  await prisma.phase.delete({ where: { id: Number(params.phaseId) } })
  return NextResponse.json({ ok: true })
}
