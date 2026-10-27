import { NextResponse } from 'next/server'
import { modifierFinanceur } from '@/lib/financement/admin'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { donneesFinanceur } from '../donnees'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => modifierFinanceur(Number(params.id), donneesFinanceur(c)))
}
