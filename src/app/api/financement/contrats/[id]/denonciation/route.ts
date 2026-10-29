import { NextResponse } from 'next/server'
import { definirDenonciation } from '@/lib/financement/contrats'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => definirDenonciation(u, Number(params.id), c.denonce !== false))
}
