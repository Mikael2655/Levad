import { prisma } from '@/lib/db'
import { statutConnexion } from '@/lib/connect/agent'

export type ClientDeconnecte = { id: number; nom: string; seuilJours: number; derniere: Date; nbPostes: number }

/** Clients dont le programme résident ne donne plus signe de vie depuis le délai réglé (10 jours par défaut). */
export async function clientsDeconnectes(): Promise<ClientDeconnecte[]> {
  const clients = await prisma.connectClient.findMany({
    where: { modeReleve: 'agent', postes: { some: {} } },
    include: { postes: { orderBy: { derniereConnexion: 'desc' } } },
    orderBy: { nom: 'asc' },
  })
  return clients
    .map((c) => ({ id: c.id, nom: c.nom, seuilJours: c.seuilDeconnexionJours, derniere: c.postes[0].derniereConnexion, nbPostes: c.postes.length }))
    .filter((c) => statutConnexion(c.derniere, c.seuilJours) === 'deconnecte')
}
