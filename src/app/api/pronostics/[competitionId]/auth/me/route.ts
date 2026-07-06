import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function GET(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ player: null })

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ player })
}
