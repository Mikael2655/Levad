import { prisma } from '@/lib/db'
import { cleGroupe, gammeDe } from '@/lib/connect/gammes'

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

const cleStock = (clientId: number, groupe: string) => `${clientId}#${groupe}`

/**
 * Stock par groupe (client + site + gamme compatible) = somme des mouvements (jamais en dessous de zéro).
 * Les anciens mouvements sans groupe (stock « global » d'avant les gammes) ne sont plus comptés.
 */
export async function stocksParGroupe(): Promise<Map<string, Stock>> {
  const lignes = await prisma.connectStockMouvement.groupBy({ by: ['clientId', 'groupe', 'couleur'], _sum: { delta: true }, where: { groupe: { not: '' } } })
  const res = new Map<string, Stock>()
  for (const l of lignes) {
    const k = cleStock(l.clientId, l.groupe)
    const s = res.get(k) ?? stockVide()
    if ((COULEURS as readonly string[]).includes(l.couleur)) s[l.couleur as Couleur] = Math.max(0, l._sum.delta ?? 0)
    res.set(k, s)
  }
  return res
}

export function stockDuGroupe(stocks: Map<string, Stock>, clientId: number, groupe: string): Stock {
  return stocks.get(cleStock(clientId, groupe)) ?? stockVide()
}

export async function stockCourant(clientId: number, groupe: string, couleur: string): Promise<number> {
  const r = await prisma.connectStockMouvement.aggregate({ where: { clientId, groupe, couleur }, _sum: { delta: true } })
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
  site: string
  groupe: string // clé du stock partagé (site + gamme)
  gamme: string | null // code de la gamme (ex. « C-EXV 49 »), null si non reconnue
  stock: Stock // stock de son groupe
  dernierReleve: Date | null
  couleurs: EtatCouleur[]
  enAlerte: boolean
}
export type ClientEtat = { id: number; nom: string; machines: MachineEtat[]; nbAlertes: number }

/** L'état d'encre de toutes les machines suivies (Canon LEVAD), client par client. */
export async function etatDuParc(): Promise<ClientEtat[]> {
  const [clients, stocks] = await Promise.all([
    prisma.connectClient.findMany({
      where: { machines: { some: { categorie: 'mine', horsContrat: false } } },
      orderBy: { nom: 'asc' },
      include: {
        machines: {
          where: { categorie: 'mine', horsContrat: false },
          orderBy: [{ site: 'asc' }, { creeLe: 'asc' }],
          include: { releves: { orderBy: { date: 'desc' }, take: 1, select: { date: true, encres: true } } },
        },
      },
    }),
    stocksParGroupe(),
  ])
  return clients.map((c) => {
    const machines = c.machines.map((m) => {
      const groupe = cleGroupe(m)
      const stock = stockDuGroupe(stocks, c.id, groupe)
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
        site: m.site,
        groupe,
        gamme: gammeDe(m)?.code ?? null,
        stock,
        dernierReleve: r?.date ?? null,
        couleurs,
        enAlerte: couleurs.some((x) => x.alerte),
      }
    })
    return { id: c.id, nom: c.nom, machines, nbAlertes: machines.filter((m) => m.enAlerte).length }
  })
}

export async function clientsEnAlerte(): Promise<ClientEtat[]> {
  return (await etatDuParc()).filter((c) => c.nbAlertes > 0)
}
