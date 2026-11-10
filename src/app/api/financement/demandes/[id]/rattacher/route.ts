import { NextResponse } from 'next/server'
import { rattacherAuFinanceur } from '@/lib/financement/actualisation'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => rattacherAuFinanceur(u, Number(params.id), String(c.reference ?? '')))
}
