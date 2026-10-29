import { NextResponse } from 'next/server'
import { changerEtapeSignature } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => changerEtapeSignature(u, Number(params.id), String(c.etape ?? '')))
}
