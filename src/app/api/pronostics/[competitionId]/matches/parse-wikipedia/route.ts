import { NextResponse } from 'next/server'
import { getCompetitionSession } from '@/lib/auth'
import { fetchWikipediaFixtures } from '@/lib/match-import'

export async function POST(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const pageTitle = body?.pageTitle?.trim()
  if (!pageTitle) {
    return NextResponse.json({ error: 'Le titre de la page Wikipédia est requis.' }, { status: 400 })
  }

  try {
    const candidates = await fetchWikipediaFixtures(pageTitle)
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "Aucun match trouvé sur cette page. Essaie une autre page (ex. la sous-page des matchs d'une phase), ou utilise l'import par liste collée." },
        { status: 422 }
      )
    }
    return NextResponse.json({ candidates })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Échec de l'import depuis Wikipédia." },
      { status: 502 }
    )
  }
}
