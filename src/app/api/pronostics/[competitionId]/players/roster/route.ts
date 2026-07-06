import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

// Liste légère (id + nom uniquement) accessible à tout joueur connecté,
// utilisée pour choisir ses favoris.
export async function GET(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const players = await prisma.player.findMany({
    where: { competitionId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return NextResponse.json(players)
}
