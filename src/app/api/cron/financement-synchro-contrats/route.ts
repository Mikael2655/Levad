export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { synchroNocturne } from '@/lib/financement/synchro-nocturne'

// Chaque nuit : synchronisation non destructive des contrats avec Grenke (voir synchro-nocturne.ts).
// Même protection que les autres tâches planifiées : en-tête « Authorization: Bearer <CRON_SECRET> ».
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await synchroNocturne())
}
