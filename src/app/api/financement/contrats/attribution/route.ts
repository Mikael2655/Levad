import { NextResponse } from 'next/server'
import { attribuerContrats } from '@/lib/financement/contrats'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

// Attribution d'une sélection de contrats à un commercial : { ids: number[], versId: number }.
export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => attribuerContrats(u, Array.isArray(c.ids) ? c.ids.map(Number) : [], Number(c.versId)))
}
