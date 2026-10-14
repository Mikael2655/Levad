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

export const SEUIL_ORANGE_JOURS = 3

export type PosteEnRetard = PosteDeconnecte & { niveau: 'orange' | 'rouge' }

/**
 * Pour la page « Alerte déconnexion » : les ordinateurs sans signal depuis 3 jours ou plus.
 * Rouge = délai du client atteint (10 jours par défaut) : c'est l'alerte qui envoie le mail. Orange = simple avertissement, sans mail.
 */
export async function postesEnRetard(): Promise<PosteEnRetard[]> {
  const clients = await prisma.connectClient.findMany({
    where: { modeReleve: 'agent', postes: { some: {} } },
    include: { postes: { orderBy: { derniereConnexion: 'asc' } } },
    orderBy: { nom: 'asc' },
  })
  const maintenant = Date.now()
  return clients.flatMap((c) =>
    c.postes.flatMap((p): PosteEnRetard[] => {
      const base = { id: p.id, clientId: c.id, clientNom: c.nom, nom: p.nom, site: p.site, seuilJours: c.seuilDeconnexionJours, derniere: p.derniereConnexion }
      if (statutConnexion(p.derniereConnexion, c.seuilDeconnexionJours) === 'deconnecte') return [{ ...base, niveau: 'rouge' }]
      const jours = (maintenant - p.derniereConnexion.getTime()) / 86400000
      return jours >= Math.min(SEUIL_ORANGE_JOURS, c.seuilDeconnexionJours) && statutConnexion(p.derniereConnexion, c.seuilDeconnexionJours) !== 'jamais'
        ? [{ ...base, niveau: 'orange' }]
        : []
    })
  )
}
