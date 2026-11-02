import { NextResponse } from 'next/server'
import { definirBanque } from '@/lib/financement/contrats'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

// Banque d'une sélection de contrats : { ids: number[], banque: string | null }.
export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => definirBanque(u, Array.isArray(c.ids) ? c.ids.map(Number) : [], typeof c.banque === 'string' ? c.banque : null))
}
