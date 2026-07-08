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

  // Plusieurs bonnes réponses possibles : on stocke un tableau JSON.
  let correctChanged = false
  if (body?.correctAnswers !== undefined) {
    const answers: string[] = Array.isArray(body.correctAnswers)
      ? body.correctAnswers.map((a: string) => String(a).trim()).filter(Boolean)
      : []
    data.correctAnswer = answers.length > 0 ? JSON.stringify(answers) : null
    correctChanged = true
  } else if (body?.correctAnswer !== undefined) {
    // rétrocompat : une seule bonne réponse
    const single = String(body.correctAnswer).trim()
    data.correctAnswer = single ? JSON.stringify([single]) : null
    correctChanged = true
  }

  const question = await prisma.bonusQuestion.update({ where: { id }, data })

  if (correctChanged) {
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
