import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const phaseId = Number(body?.phaseId)
  const matches = Array.isArray(body?.matches) ? body.matches : []

  const phase = await prisma.phase.findFirst({ where: { id: phaseId, competitionId } })
  if (!phase) return NextResponse.json({ error: 'Phase introuvable.' }, { status: 404 })

  const valid = matches.filter(
    (m: { homeTeam?: string; awayTeam?: string; kickoff?: string }) => m.homeTeam && m.awayTeam && m.kickoff
  )

  if (valid.length === 0) {
    return NextResponse.json({ error: 'Aucun match valide à importer (équipes et date/heure requises).' }, { status: 400 })
  }

  const result = await prisma.match.createMany({
    data: valid.map((m: { homeTeam: string; awayTeam: string; kickoff: string }) => ({
      competitionId,
      phaseId,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoff: new Date(m.kickoff),
    })),
  })

  return NextResponse.json({ created: result.count, skipped: matches.length - valid.length })
}
