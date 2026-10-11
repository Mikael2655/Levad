import { prisma } from '@/lib/db'
import { statutConnexion } from '@/lib/connect/agent'

export type PosteDeconnecte = {
  id: number
  clientId: number
  clientNom: string
  nom: string
  site: string
  seuilJours: number
  derniere: Date
}

/** Ordinateurs dont le programme ne donne plus signe de vie depuis le délai réglé pour leur client (10 jours par défaut). */
export async function postesDeconnectes(): Promise<PosteDeconnecte[]> {
  const clients = await prisma.connectClient.findMany({
    where: { modeReleve: 'agent', postes: { some: {} } },
    include: { postes: { orderBy: { derniereConnexion: 'asc' } } },
    orderBy: { nom: 'asc' },
  })
  return clients.flatMap((c) =>
    c.postes
      .filter((p) => statutConnexion(p.derniereConnexion, c.seuilDeconnexionJours) === 'deconnecte')
      .map((p) => ({ id: p.id, clientId: c.id, clientNom: c.nom, nom: p.nom, site: p.site, seuilJours: c.seuilDeconnexionJours, derniere: p.derniereConnexion }))
  )
}
