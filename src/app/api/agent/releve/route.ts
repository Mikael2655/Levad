import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { clientParRequete } from '@/lib/connect/agent'
import { enregistrerReleve } from '@/lib/connect/ingestion'

// Relevé envoyé par le programme résident (toutes les 30 minutes, ou à la demande).
// Le client est identifié par le code de son lien personnel : pas de saisie de nom de société.

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_OCTETS = 3_500_000

export async function POST(req: Request) {
  const client = await clientParRequete(req)
  if (!client) return NextResponse.json({ error: 'code inconnu' }, { status: 401 })

  const brut = await req.text()
  if (Buffer.byteLength(brut) > MAX_OCTETS) return NextResponse.json({ error: 'trop volumineux' }, { status: 413 })
  let data: any
  try {
    data = JSON.parse(brut)
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  if (!data || !Array.isArray(data.machines)) return NextResponse.json({ error: 'format inattendu' }, { status: 400 })

  data.source = 'agent'
  const res = await enregistrerReleve(data, { id: client.id })

  // les demandes de lecture immédiate traitées par ce relevé sont closes
  const ids: number[] = (Array.isArray(data.commandeIds) ? data.commandeIds : []).map(Number).filter(Number.isInteger)
  if (ids.length) {
    await prisma.connectCommande.updateMany({
      where: { id: { in: ids }, clientId: client.id },
      data: { faiteLe: new Date() },
    })
  }
  return NextResponse.json({ ok: true, machines: res.machines })
}
