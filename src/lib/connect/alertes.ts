import { prisma } from '@/lib/db'

// Alertes d'encre : un client est en alerte pour une couleur tant que le niveau est SOUS LE SEUIL
// et qu'il n'a PAS de cartouche de cette couleur en stock. Ne concerne que « mes machines ».

export const COULEURS = ['noir', 'cyan', 'magenta', 'jaune'] as const
export type Couleur = (typeof COULEURS)[number]
export const NOM_COULEUR: Record<Couleur, string> = { noir: 'Noir', cyan: 'Cyan', magenta: 'Magenta', jaune: 'Jaune' }
export type Stock = Record<Couleur, number>

type Seuils = { seuilNoir: number; seuilCyan: number; seuilMagenta: number; seuilJaune: number }
export function seuilDe(m: Seuils, c: Couleur): number {
  return { noir: m.seuilNoir, cyan: m.seuilCyan, magenta: m.seuilMagenta, jaune: m.seuilJaune }[c]
}

export function stockVide(): Stock {
  return { noir: 0, cyan: 0, magenta: 0, jaune: 0 }
}

/** Stock de chaque client = somme de ses mouvements (jamais en dessous de zéro). */
export async function stocksParClient(): Promise<Map<number, Stock>> {
  const lignes = await prisma.connectStockMouvement.groupBy({ by: ['clientId', 'couleur'], _sum: { delta: true } })
  const res = new Map<number, Stock>()
  for (const l of lignes) {
    const s = res.get(l.clientId) ?? stockVide()
    if ((COULEURS as readonly string[]).includes(l.couleur)) s[l.couleur as Couleur] = Math.max(0, l._sum.delta ?? 0)
    res.set(l.clientId, s)
  }
  return res
}

export async function stockCourant(clientId: number, couleur: string): Promise<number> {
  const r = await prisma.connectStockMouvement.aggregate({ where: { clientId, couleur }, _sum: { delta: true } })
  return r._sum.delta ?? 0
}

type EncreJson = { couleur: string | null; pourcent: number | null }

export type EtatCouleur = {
  couleur: Couleur
  pourcent: number | null
  seuil: number
  bas: boolean // niveau sous le seuil
  stock: number
  alerte: boolean // bas ET aucune cartouche en stock
}
export type MachineEtat = {
  id: number
  nom: string
  dernierReleve: Date | null
  couleurs: EtatCouleur[]
  enAlerte: boolean
}
export type ClientEtat = { id: number; nom: string; stock: Stock; machines: MachineEtat[]; nbAlertes: number }

/** L'état d'encre de toutes les machines suivies (Canon LEVAD), client par client. */
export async function etatDuParc(): Promise<ClientEtat[]> {
  const [clients, stocks] = await Promise.all([
    prisma.connectClient.findMany({
      where: { machines: { some: { categorie: 'mine' } } },
      orderBy: { nom: 'asc' },
      include: {
        machines: {
          where: { categorie: 'mine' },
          orderBy: { creeLe: 'asc' },
          include: { releves: { orderBy: { date: 'desc' }, take: 1, select: { date: true, encres: true } } },
        },
      },
    }),
    stocksParClient(),
  ])
  return clients.map((c) => {
    const stock = stocks.get(c.id) ?? stockVide()
    const machines = c.machines.map((m) => {
      const r = m.releves[0]
      const encres = ((r?.encres ?? []) as unknown as EncreJson[]) ?? []
      const couleurs = COULEURS.map((couleur): EtatCouleur => {
        const p = encres.find((e) => e.couleur === couleur && typeof e.pourcent === 'number')?.pourcent ?? null
        const seuil = seuilDe(m, couleur)
        const bas = p !== null && p <= seuil
        return { couleur, pourcent: p, seuil, bas, stock: stock[couleur], alerte: bas && stock[couleur] <= 0 }
      })
      return {
        id: m.id,
        nom: m.nomAffiche || m.modele || 'Machine inconnue',
        dernierReleve: r?.date ?? null,
        couleurs,
        enAlerte: couleurs.some((x) => x.alerte),
      }
    })
    return { id: c.id, nom: c.nom, stock, machines, nbAlertes: machines.filter((m) => m.enAlerte).length }
  })
}

export async function clientsEnAlerte(): Promise<ClientEtat[]> {
  return (await etatDuParc()).filter((c) => c.nbAlertes > 0)
}
