import { prisma } from '@/lib/db'
import { statutConnexion } from '@/lib/connect/agent'
import { trierParNom } from '@/lib/connect/tri'
import { libelleMachine } from '@/lib/connect/libelle'

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
  return trierParNom(clients).flatMap((c) =>
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
  return trierParNom(clients).flatMap((c) =>
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

export type MachineNonReleve = {
  id: number
  clientId: number
  clientNom: string
  nom: string
  site: string
  seuilJours: number
  derniere: Date
  niveau: 'orange' | 'rouge'
}

/**
 * Machines sous contrat qui ne sont plus relevées alors que le programme du client, lui, répond : au moins un de ses
 * ordinateurs a donné signe de vie récemment. Sans cette alerte, une machine oubliée (changement de réseau, copieur
 * éteint, adresse modifiée) ne remonte plus d'alerte d'encre sans que personne le voie.
 * Mêmes seuils que les ordinateurs : 3 jours (noir), délai du client (rouge).
 */
export async function machinesNonReleves(): Promise<MachineNonReleve[]> {
  const clients = await prisma.connectClient.findMany({
    where: { modeReleve: 'agent', postes: { some: {} } },
    include: {
      postes: true,
      machines: { where: { categorie: 'mine', horsContrat: false }, include: { releves: { orderBy: { date: 'desc' }, take: 1, select: { date: true } } } },
    },
    orderBy: { nom: 'asc' },
  })
  const maintenant = Date.now()
  return trierParNom(clients).flatMap((c) => {
    // si tous les ordinateurs du client sont en retard, c'est déjà signalé dans la liste des ordinateurs
    const unPosteRepond = c.postes.some((p) => (maintenant - p.derniereConnexion.getTime()) / 86400000 < Math.min(SEUIL_ORANGE_JOURS, c.seuilDeconnexionJours))
    if (!unPosteRepond) return []
    return c.machines.flatMap((m): MachineNonReleve[] => {
      const derniere = m.releves[0]?.date ?? m.creeLe
      const jours = (maintenant - derniere.getTime()) / 86400000
      if (jours < Math.min(SEUIL_ORANGE_JOURS, c.seuilDeconnexionJours)) return []
      return [{ id: m.id, clientId: c.id, clientNom: c.nom, nom: libelleMachine(m, 'Machine inconnue'), site: m.site, seuilJours: c.seuilDeconnexionJours, derniere, niveau: jours >= c.seuilDeconnexionJours ? 'rouge' : 'orange' }]
    })
  })
}
