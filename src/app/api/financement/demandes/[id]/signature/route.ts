import { NextResponse } from 'next/server'
import { envoyerEnSignature, type Signataire } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

const signataire = (s: Record<string, any> | undefined): Signataire => ({ prenom: String(s?.prenom ?? ''), nom: String(s?.nom ?? ''), email: String(s?.email ?? '') })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => envoyerEnSignature(u, Number(params.id), signataire(c.client), signataire(c.fournisseur)))
}
