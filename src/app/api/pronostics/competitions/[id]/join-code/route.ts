import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { generateJoinCode } from '@/lib/competition'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const competitionId = Number(params.id)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  let joinCode = generateJoinCode()
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await prisma.competition.findUnique({ where: { joinCode } })
    if (!existing) break
    joinCode = generateJoinCode()
  }

  const competition = await prisma.competition.update({ where: { id: competitionId }, data: { joinCode } })
  return NextResponse.json({ joinCode: competition.joinCode })
}
