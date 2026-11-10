import { NextResponse } from 'next/server'
import { rechercherDoublons } from '@/lib/financement/doublons'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => rechercherDoublons(u, { siret: String(c.siret ?? ''), raisonSociale: String(c.raisonSociale ?? ''), exclureDemandeId: c.demandeId ? Number(c.demandeId) : null }))
}
