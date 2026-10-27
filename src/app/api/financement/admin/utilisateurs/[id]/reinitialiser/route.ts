import { NextResponse } from 'next/server'
import { reinitialiserMotDePasse } from '@/lib/financement/admin'
import { acteurApi, repondre } from '@/lib/financement/garde'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  return repondre(() => reinitialiserMotDePasse(Number(params.id)))
}
