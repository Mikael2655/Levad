import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { clientParRequete } from '@/lib/connect/agent'

// Signal de vie du programme résident (toutes les minutes) :
//  - enregistre / met à jour le PC (nom, système, version, dernière connexion) ;
//  - remet le client « connecté » (efface une déconnexion déjà signalée) ;
//  - renvoie les demandes de lecture immédiate (bouton « Actualiser »).

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const client = await clientParRequete(req)
  if (!client) return NextResponse.json({ error: 'code inconnu' }, { status: 401 })

  let corps: any = {}
  try {
    corps = await req.json()
  } catch {
    // corps absent : on garde les valeurs par défaut
  }
  const nom = String(corps.pc ?? '').trim().slice(0, 80) || 'PC inconnu'
  const systeme = String(corps.systeme ?? '').trim().slice(0, 120) || null
  const version = String(corps.version ?? '').trim().slice(0, 20) || null

  await prisma.connectPoste.upsert({
    where: { clientId_nom: { clientId: client.id, nom } },
    update: { derniereConnexion: new Date(), systeme, versionAgent: version, deconnexionSignaleLe: null },
    create: { clientId: client.id, nom, systeme, versionAgent: version },
  })
  if (client.deconnexionSignaleLe) {
    await prisma.connectClient.update({ where: { id: client.id }, data: { deconnexionSignaleLe: null } })
  }

  // demandes de lecture en attente (ou prises depuis plus de 10 minutes sans réponse : on les redonne)
  const dix = new Date(Date.now() - 10 * 60 * 1000)
  const commandes = await prisma.connectCommande.findMany({
    where: { clientId: client.id, faiteLe: null, OR: [{ priseLe: null }, { priseLe: { lt: dix } }] },
    orderBy: { creeLe: 'asc' },
    take: 20,
  })
  if (commandes.length) {
    await prisma.connectCommande.updateMany({
      where: { id: { in: commandes.map((c) => c.id) } },
      data: { priseLe: new Date(), posteNom: nom },
    })
  }
  return NextResponse.json({
    ok: true,
    client: client.nom,
    intervalleMinutes: 30,
    commandes: commandes.map((c) => ({ id: c.id, type: c.type, machineId: c.machineId })),
  })
}
