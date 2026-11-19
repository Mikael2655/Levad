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

export const SEUIL_ORANGE_JOURS = 5
/** Un ordinateur « répond » s'il a donné signe de vie depuis moins de 3 jours (pour signaler les machines non relevées d'un client dont le programme fonctionne). */
const SEUIL_POSTE_REPOND_JOURS = 3

export type PosteEnRetard = PosteDeconnecte & { niveau: 'orange' | 'rouge' }

/**
 * Pour la page « Alerte déconnexion » : les ordinateurs sans signal depuis 5 jours ou plus.
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
 * Machines sous contrat que le programme a déjà lues mais qui ne sont plus relevées alors que le programme du client, lui, répond : au moins un de ses
 * ordinateurs a donné signe de vie récemment. Sans cette alerte, une machine oubliée (changement de réseau, copieur
 * éteint, adresse modifiée) ne remonte plus d'alerte d'encre sans que personne le voie.
 * Mêmes seuils que les ordinateurs : 5 jours (noir), délai du client (rouge).
 */
export async function machinesNonReleves(): Promise<MachineNonReleve[]> {
  const clients = await prisma.connectClient.findMany({
    where: { modeReleve: 'agent', postes: { some: {} } },
    include: {
      postes: true,
      machines: { where: { categorie: 'mine', horsContrat: false }, include: { releves: { where: { source: { not: 'import' } }, orderBy: { date: 'desc' }, take: 1, select: { date: true } } } },
    },
    orderBy: { nom: 'asc' },
  })
  const maintenant = Date.now()
  return trierParNom(clients).flatMap((c) => {
    // si tous les ordinateurs du client sont en retard, c'est déjà signalé dans la liste des ordinateurs
    const unPosteRepond = c.postes.some((p) => (maintenant - p.derniereConnexion.getTime()) / 86400000 < Math.min(SEUIL_POSTE_REPOND_JOURS, c.seuilDeconnexionJours))
    if (!unPosteRepond) return []
    return c.machines.flatMap((m): MachineNonReleve[] => {
      // une machine que le programme n'a jamais lue (relevés importés seulement, ou rien) n'est pas signalée : elle n'a jamais été « relevée » par lui
      if (!m.releves[0]) return []
      const derniere = m.releves[0].date
      const jours = (maintenant - derniere.getTime()) / 86400000
      if (jours < Math.min(SEUIL_ORANGE_JOURS, c.seuilDeconnexionJours)) return []
      return [{ id: m.id, clientId: c.id, clientNom: c.nom, nom: libelleMachine(m, 'Machine inconnue'), site: m.site, seuilJours: c.seuilDeconnexionJours, derniere, niveau: jours >= c.seuilDeconnexionJours ? 'rouge' : 'orange' }]
    })
  })
}
