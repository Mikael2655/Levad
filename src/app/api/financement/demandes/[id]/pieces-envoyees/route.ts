import { NextResponse } from 'next/server'
import { acteurApi, repondre } from '@/lib/financement/garde'
import { confirmerPiecesEnvoyees } from '@/lib/financement/pieces-demandees'

export const runtime = 'nodejs'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => confirmerPiecesEnvoyees(u, Number(params.id)))
}
