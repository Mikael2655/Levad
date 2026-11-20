import { NextResponse } from 'next/server'
import { enregistrerAccord } from '@/lib/financement/accords'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => enregistrerAccord(u, Number(params.id), { montantReelCentimes: Number(c.montantReelCentimes), note: typeof c.note === 'string' ? c.note : null, numeroAccord: typeof c.numeroAccord === 'string' ? c.numeroAccord : null }))
}
