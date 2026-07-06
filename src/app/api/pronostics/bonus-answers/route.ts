import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const answers = await prisma.bonusAnswer.findMany({ where: { playerId: session.playerId } })
  return NextResponse.json(answers)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const bonusQuestionId = Number(body?.bonusQuestionId)
  const answer = body?.answer?.trim()

  if (!answer) {
    return NextResponse.json({ error: 'Une réponse est requise.' }, { status: 400 })
  }

  const question = await prisma.bonusQuestion.findUnique({ where: { id: bonusQuestionId } })
  if (!question) return NextResponse.json({ error: 'Question introuvable.' }, { status: 404 })
  if (question.deadline && new Date(question.deadline) <= new Date()) {
    return NextResponse.json({ error: 'La date limite pour répondre est dépassée.' }, { status: 403 })
  }

  const saved = await prisma.bonusAnswer.upsert({
    where: { playerId_bonusQuestionId: { playerId: session.playerId, bonusQuestionId } },
    update: { answer },
    create: { playerId: session.playerId, bonusQuestionId, answer },
  })

  return NextResponse.json(saved)
}
