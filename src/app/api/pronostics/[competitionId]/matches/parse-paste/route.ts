import { NextResponse } from 'next/server'
import { getCompetitionSession } from '@/lib/auth'
import { parsePastedList } from '@/lib/match-import'

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const text = body?.text ?? ''
  const candidates = parsePastedList(text)

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'Aucune ligne valide. Format attendu par ligne : Équipe A;Équipe B;2026-06-12 20:00' },
      { status: 422 }
    )
  }

  return NextResponse.json({ candidates })
}
