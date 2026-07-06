import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { recomputeBonusAnswers } from '@/lib/scoring'

export async function PATCH(
  request: Request,
  { params }: { params: { competitionId: string; id: string } }
) {
  const competitionId = Number(params.competitionId)
  const id = Number(params.id)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (body?.question !== undefined) data.question = body.question
  if (body?.points !== undefined) data.points = Number(body.points)
  if (body?.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
  if (body?.correctAnswer !== undefined) data.correctAnswer = body.correctAnswer

  const question = await prisma.bonusQuestion.update({ where: { id }, data })

  if (body?.correctAnswer !== undefined) {
    await recomputeBonusAnswers(id)
  }

  return NextResponse.json(question)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { competitionId: string; id: string } }
) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  await prisma.bonusQuestion.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
