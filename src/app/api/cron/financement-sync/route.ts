export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { actualiserToutesLesDemandesOuvertes } from '@/lib/financement/actualisation'

// Toutes les 15 minutes : met à jour le statut des demandes en cours chez Grenke (accord, refus, pièces demandées, signature...).
// Même protection que les autres tâches planifiées : en-tête « Authorization: Bearer <CRON_SECRET> ».
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await actualiserToutesLesDemandesOuvertes({ force: true, delaiMs: 50_000 }))
}
