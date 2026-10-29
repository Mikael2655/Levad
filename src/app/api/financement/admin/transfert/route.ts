import { NextResponse } from 'next/server'
import { transfererContrats } from '@/lib/financement/contrats'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => transfererContrats(u, Number(c.deId), Number(c.versId)))
}
