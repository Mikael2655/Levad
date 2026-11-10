import { NextResponse } from 'next/server'
import { actualiserDepuisFinanceur } from '@/lib/financement/actualisation'
import { acteurApi, repondre } from '@/lib/financement/garde'

export const runtime = 'nodejs'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => actualiserDepuisFinanceur(u, Number(params.id)))
}
