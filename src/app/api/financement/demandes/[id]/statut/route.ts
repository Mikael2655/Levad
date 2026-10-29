import { NextResponse } from 'next/server'
import { changerStatut } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() =>
    changerStatut(u, Number(params.id), {
      statut: String(c.statut ?? ''),
      commentaire: typeof c.commentaire === 'string' ? c.commentaire : undefined,
      infosManquantes: typeof c.infosManquantes === 'string' ? c.infosManquantes : undefined,
      refFinanceur: typeof c.refFinanceur === 'string' ? c.refFinanceur : undefined,
      montantReelCentimes: c.montantReelCentimes === undefined || c.montantReelCentimes === null || c.montantReelCentimes === '' ? undefined : Number(c.montantReelCentimes),
    }),
  )
}
