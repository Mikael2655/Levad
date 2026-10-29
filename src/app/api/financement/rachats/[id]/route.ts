import { NextResponse } from 'next/server'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { changerStatutRachat, envoyerRachat } from '@/lib/financement/rachats'

// { action: 'envoyer' } : envoie la demande au financeur ; { action: 'statut', statut: 'SIGNEE' | 'ANNULEE' }.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => (c.action === 'envoyer' ? envoyerRachat(u, Number(params.id)) : changerStatutRachat(u, Number(params.id), String(c.statut ?? ''))))
}
