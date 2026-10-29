import { NextResponse } from 'next/server'
import { modifierDemande, normaliserEntree, supprimerDemande } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => modifierDemande(u, Number(params.id), normaliserEntree(c)))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => supprimerDemande(u, Number(params.id)))
}
