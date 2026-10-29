import { NextResponse } from 'next/server'
import { renvoyerMailFinanceur } from '@/lib/financement/demandes'
import { acteurApi, repondre } from '@/lib/financement/garde'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => renvoyerMailFinanceur(u, Number(params.id)))
}
