import { NextResponse } from 'next/server'
import { getCompetitionSession } from '@/lib/auth'
import { syncCompetition } from '@/lib/sync'
import { FootballDataError } from '@/lib/football-data'

// Appelée par les pages (dashboard/résultats) pendant qu'un joueur les a
// ouvertes : respecte le throttle interne, donc sans risque pour le quota API
// même avec plusieurs joueurs connectés en même temps.
export async function GET(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  try {
    const result = await syncCompetition(competitionId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof FootballDataError ? err.message : 'Erreur de synchronisation.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

// Synchronisation manuelle forcée par l'admin (ignore le throttle).
export async function POST(_request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  try {
    const result = await syncCompetition(competitionId, { force: true })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof FootballDataError ? err.message : 'Erreur de synchronisation.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
