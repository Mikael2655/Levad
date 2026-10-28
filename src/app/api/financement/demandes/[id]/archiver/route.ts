import { NextResponse } from 'next/server'
import { archiverDemande } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => archiverDemande(u, Number(params.id), c.archivee !== false))
}
