export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { actualiserToutesLesDemandesOuvertes } from '@/lib/financement/actualisation'
import { purgerPieces } from '@/lib/financement/pieces'

// Passage quotidien (outil de financement) : supprime les pièces jointes de plus de 60 jours et actualise les demandes en cours chez Grenke.
// Même protection que les autres tâches planifiées : en-tête « Authorization: Bearer <CRON_SECRET> ».
// (Le nettoyage se fait aussi tout seul quand quelqu'un utilise les pièces jointes : voir purgeOpportuniste.)
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supprimees = await purgerPieces()
  const actualisation = await actualiserToutesLesDemandesOuvertes({ force: true, delaiMs: 40_000 }) // met aussi à jour le statut des demandes chez Grenke
  return NextResponse.json({ supprimees, actualisation })
}
