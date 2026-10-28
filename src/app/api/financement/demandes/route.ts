import { NextResponse } from 'next/server'
import { creerDemande, normaliserEntree } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => creerDemande(u, normaliserEntree(c)))
}
