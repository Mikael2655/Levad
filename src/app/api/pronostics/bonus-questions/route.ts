import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const questions = await prisma.bonusQuestion.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(questions)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const question = body?.question?.trim()
  const type = body?.type === 'CHOICE' ? 'CHOICE' : 'TEXT'
  const points = Number.isInteger(body?.points) ? body.points : 3
  const deadline = body?.deadline ? new Date(body.deadline) : null
  const options: string[] | undefined = Array.isArray(body?.options)
    ? body.options.map((o: string) => o.trim()).filter(Boolean)
    : undefined

  if (!question) {
    return NextResponse.json({ error: 'La question est requise.' }, { status: 400 })
  }
  if (type === 'CHOICE' && (!options || options.length < 2)) {
    return NextResponse.json({ error: 'Au moins 2 options sont requises pour une question à choix.' }, { status: 400 })
  }

  const created = await prisma.bonusQuestion.create({
    data: {
      question,
      type,
      points,
      deadline,
      options: type === 'CHOICE' ? JSON.stringify(options) : null,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
