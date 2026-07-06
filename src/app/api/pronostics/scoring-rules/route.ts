import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getScoringRule, recomputeAllFinishedMatches } from '@/lib/scoring'

export async function GET() {
  const rule = await getScoringRule()
  return NextResponse.json(rule)
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const pointsExactScore = Number(body?.pointsExactScore)
  const pointsGoalDifference = Number(body?.pointsGoalDifference)
  const pointsCorrectOutcome = Number(body?.pointsCorrectOutcome)

  if (
    !Number.isInteger(pointsExactScore) ||
    !Number.isInteger(pointsGoalDifference) ||
    !Number.isInteger(pointsCorrectOutcome) ||
    pointsExactScore < 0 ||
    pointsGoalDifference < 0 ||
    pointsCorrectOutcome < 0
  ) {
    return NextResponse.json({ error: 'Valeurs de barème invalides.' }, { status: 400 })
  }

  const current = await getScoringRule()
  const updated = await prisma.scoringRule.update({
    where: { id: current.id },
    data: { pointsExactScore, pointsGoalDifference, pointsCorrectOutcome },
  })

  await recomputeAllFinishedMatches()

  return NextResponse.json(updated)
}
