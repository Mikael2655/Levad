// Couche d'accès aux demandes : les pages et routes passent TOUJOURS par ici, jamais par prisma directement.
// Le filtre « un commercial ne voit que ses demandes » est dans la requête SQL, et la réponse passe par vueDemande.
import { prisma } from '@/lib/db'
import { estInterne, vueDemande, type Acteur } from './droits'

export interface FiltresDemandes {
  statut?: string
  financeurId?: number
  commercialId?: number // ignoré pour un commercial
  du?: Date
  au?: Date
  archivees?: boolean
}

export async function listerDemandes(acteur: Acteur, f: FiltresDemandes = {}) {
  const lignes = await prisma.finDemande.findMany({
    where: {
      ...(estInterne(acteur) ? (f.commercialId ? { commercialId: f.commercialId } : {}) : { commercialId: acteur.id }),
      archivee: f.archivees ?? false,
      ...(f.statut ? { statut: f.statut } : {}),
      ...(f.financeurId ? { financeurId: f.financeurId } : {}),
      ...(f.du || f.au ? { creeLe: { ...(f.du ? { gte: f.du } : {}), ...(f.au ? { lte: f.au } : {}) } } : {}),
    },
    orderBy: { creeLe: 'desc' },
  })
  return lignes.map(d => vueDemande(acteur, d))
}

// null si la demande n'existe pas OU si l'acteur n'a pas le droit de la voir (même réponse : on ne révèle rien).
export async function lireDemande(acteur: Acteur, id: number) {
  const d = await prisma.finDemande.findFirst({
    where: { id, ...(estInterne(acteur) ? {} : { commercialId: acteur.id }) },
    include: { lignes: true, pieces: true, historique: { orderBy: { date: 'asc' } }, signature: true },
  })
  if (!d) return null
  const { lignes, pieces, historique, signature, ...base } = d
  return { ...vueDemande(acteur, base), lignes, pieces, historique, signature }
}
