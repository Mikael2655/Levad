import { NextResponse } from 'next/server'
import { cloturerContrats } from '@/lib/financement/contrats'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => cloturerContrats(u, Array.isArray(c.ids) ? c.ids.map(Number) : [], { motif: String(c.motif ?? ''), confirmation: typeof c.confirmation === 'string' ? c.confirmation : undefined }))
}
