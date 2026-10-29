import { NextResponse } from 'next/server'
import { creerFinanceur, listerFinanceurs } from '@/lib/financement/admin'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { donneesFinanceur } from './donnees'

export async function GET() {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  return repondre(() => listerFinanceurs())
}

export async function POST(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => creerFinanceur({ ...donneesFinanceur(c), nom: String(c.nom ?? '') }))
}
