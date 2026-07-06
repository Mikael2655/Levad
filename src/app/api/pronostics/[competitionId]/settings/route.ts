import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (body?.externalCode !== undefined) {
    const code = body.externalCode?.trim().toUpperCase()
    data.externalCode = code || null
  }

  const competition = await prisma.competition.update({ where: { id: competitionId }, data })
  return NextResponse.json(competition)
}
