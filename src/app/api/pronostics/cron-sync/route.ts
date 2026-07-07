import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncCompetition } from '@/lib/sync'
import { FootballDataError } from '@/lib/football-data'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Synchronise toutes les compétitions configurées. Appelée par un
// planificateur externe (Vercel Cron ou cron-job.org), jamais par un
// navigateur : protégée par CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré côté serveur.' }, { status: 500 })
  }

  const url = new URL(request.url)
  const authHeader = request.headers.get('authorization')
  const authorized = authHeader === `Bearer ${secret}` || url.searchParams.get('token') === secret
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const competitions = await prisma.competition.findMany({
    where: { externalCode: { not: null } },
    select: { id: true, name: true },
  })

  const results: Array<{ id: number; name: string; ok: boolean; detail?: string }> = []

  for (const competition of competitions) {
    try {
      const result = await syncCompetition(competition.id)
      results.push({
        id: competition.id,
        name: competition.name,
        ok: true,
        detail: result.synced ? `${result.matchCount} match(s)` : result.reason,
      })
    } catch (err) {
      results.push({
        id: competition.id,
        name: competition.name,
        ok: false,
        detail: err instanceof FootballDataError ? err.message : 'Erreur de synchronisation.',
      })
    }
  }

  return NextResponse.json({ syncedAt: new Date().toISOString(), results })
}
