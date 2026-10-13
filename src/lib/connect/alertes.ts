import { cache } from 'react'
import { Prisma } from '@prisma/client'
import { libelleMachine } from '@/lib/connect/libelle'
import { DELAI_ALERTE_JOURS, FENETRE_JOURS, previsionJours } from './prevision'
import { avecEncres } from './releves'
import { prisma } from '@/lib/db'
import { cleGroupe, gammeDe } from '@/lib/connect/gammes'

// Alertes d'encre : un client est en alerte pour une couleur quand il lui reste moins de 10 jours d'encre
// (estimés d'après la consommation des 60 derniers jours) et qu'il n'a PAS de cartouche de cette couleur en stock (au-dessus du stock minimum réglé pour lui).
// Après un changement de cartouche, on reprend la consommation de la précédente ; tant que la machine n'a pas assez
// d'historique (moins de 7 jours de mesures), c'est le seuil en % qui s'applique. Ne concerne que « mes machines ».

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
  const lignes = await prisma.connectStockMouvement.groupBy({
    by: ['clientId', 'groupe', 'couleur', 'variante'],
    _sum: { delta: true },
    where: { groupe: { not: '' } },
  })
  const res = new Map<string, Stock>()
  for (const l of lignes) {
    const k = cleStock(l.clientId, l.groupe)
    const s = res.get(k) ?? stockVide()
    // chaque version (standard, L, H) est comptée à part, jamais en dessous de zéro, puis additionnée
    if ((COULEURS as readonly string[]).includes(l.couleur)) s[l.couleur as Couleur] += Math.max(0, l._sum.delta ?? 0)
    res.set(k, s)
  }
  return res
}

/** Détail par couleur puis par version (« » = standard) du stock de chaque groupe. */
export type StockDetail = Record<string, Record<string, number>>
export async function detailsParGroupe(): Promise<Map<string, StockDetail>> {
  const lignes = await prisma.connectStockMouvement.groupBy({
    by: ['clientId', 'groupe', 'couleur', 'variante'],
    _sum: { delta: true },
    where: { groupe: { not: '' } },
  })
  const res = new Map<string, StockDetail>()
  for (const l of lignes) {
    const k = cleStock(l.clientId, l.groupe)
    const d = res.get(k) ?? {}
    ;(d[l.couleur] ??= {})[l.variante] = Math.max(0, l._sum.delta ?? 0)
    res.set(k, d)
  }
  return res
}

/** Stock minimum que le client veut garder d'avance, par groupe et par couleur : en dessous (ou à égalité), tout se passe comme s'il n'en avait plus. */
export async function minimumsParGroupe(): Promise<Map<string, Stock>> {
  const res = new Map<string, Stock>()
  try {
    for (const l of await prisma.connectStockMinimum.findMany()) {
      const k = cleStock(l.clientId, l.groupe)
      const s = res.get(k) ?? stockVide()
      if ((COULEURS as readonly string[]).includes(l.couleur)) s[l.couleur as Couleur] = Math.max(0, l.minimum)
      res.set(k, s)
    }
  } catch {
    // table pas encore créée : aucun minimum
  }
  return res
}

export function minimumDuGroupe(min: Map<string, Stock>, clientId: number, groupe: string): Stock {
  return min.get(cleStock(clientId, groupe)) ?? stockVide()
}

export function stockDuGroupe(stocks: Map<string, Stock>, clientId: number, groupe: string): Stock {
  return stocks.get(cleStock(clientId, groupe)) ?? stockVide()
}

export async function stockCourant(clientId: number, groupe: string, couleur: string, variante: string): Promise<number> {
  const r = await prisma.connectStockMouvement.aggregate({ where: { clientId, groupe, couleur, variante }, _sum: { delta: true } })
  return r._sum.delta ?? 0
}

/** La version de cartouche à décompter quand une cartouche est changée : celle dont le stock est le plus grand (standard en cas d'égalité). */
export async function varianteADecompter(clientId: number, groupe: string, couleur: string): Promise<string | null> {
  const lignes = await prisma.connectStockMouvement.groupBy({ by: ['variante'], _sum: { delta: true }, where: { clientId, groupe, couleur } })
  let meilleure: string | null = null
  let max = 0
  for (const l of lignes.sort((a, b) => a.variante.localeCompare(b.variante))) {
    const q = l._sum.delta ?? 0
    if (q > max) { max = q; meilleure = l.variante }
  }
  return meilleure
}

type EncreJson = { couleur: string | null; pourcent: number | null }

export type EtatCouleur = {
  couleur: Couleur
  pourcent: number | null
  seuil: number
  bas: boolean // il reste peu d'encre (moins de 10 jours estimés, ou niveau sous le seuil faute d'historique)
  jours: number | null // jours d'encre restants estimés (null : pas d'estimation, ou consommation quasi nulle)
  mode: 'duree' | 'pourcent' // règle appliquée : durée estimée, ou seuil en % (historique insuffisant)
  stock: number
  minimum: number // stock à garder d'avance (réglé pour le client)
  alerte: boolean // bas ET plus de cartouche au-dessus du minimum
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

/** Un niveau par jour et par machine sur les 60 derniers jours (le dernier relevé de chaque jour) : léger et suffisant pour la prévision. */
async function niveauxQuotidiens(ids: number[]): Promise<Map<number, { t: number; encres: EncreJson[] }[]>> {
  const res = new Map<number, { t: number; encres: EncreJson[] }[]>()
  if (ids.length === 0) return res
  const lignes = await prisma.$queryRaw<{ machineId: number; date: Date; encres: unknown }[]>(Prisma.sql`
    SELECT DISTINCT ON ("machineId", jour) "machineId", date, encres FROM (
      SELECT "machineId", date, encres, date_trunc('day', date AT TIME ZONE 'Europe/Paris') AS jour
      FROM connect_releve
      WHERE "machineId" IN (${Prisma.join(ids)}) AND date > now() - ${`${FENETRE_JOURS} days`}::interval AND encres IS NOT NULL
    ) s ORDER BY "machineId", jour, date DESC`)
  for (const l of lignes) {
    if (!Array.isArray(l.encres) || l.encres.length === 0) continue
    const liste = res.get(l.machineId) ?? []
    liste.push({ t: new Date(l.date).getTime(), encres: l.encres as EncreJson[] })
    res.set(l.machineId, liste)
  }
  return res
}

/** L'état d'encre de toutes les machines suivies (Canon LEVAD), client par client. */
export const etatDuParc = cache(async function etatDuParc(): Promise<ClientEtat[]> {
  const [clients, stocks, minimums] = await Promise.all([
    prisma.connectClient.findMany({
      where: { machines: { some: { categorie: 'mine', horsContrat: false } } },
      orderBy: { nom: 'asc' },
      include: {
        machines: {
          where: { categorie: 'mine', horsContrat: false },
          orderBy: [{ site: 'asc' }, { creeLe: 'asc' }],
          include: { releves: { orderBy: { date: 'desc' }, take: 10, select: { date: true, encres: true } } },
        },
      },
    }),
    stocksParGroupe(),
    minimumsParGroupe(),
  ])
  const niveaux = await niveauxQuotidiens(clients.flatMap((c) => c.machines.map((m) => m.id)))
  return clients.map((c) => {
    const machines = c.machines.map((m) => {
      const groupe = cleGroupe(m)
      const stock = stockDuGroupe(stocks, c.id, groupe)
      const minimum = minimumDuGroupe(minimums, c.id, groupe)
      const r = avecEncres(m.releves)
      const encres = ((r?.encres ?? []) as unknown as EncreJson[]) ?? []
      const couleurs = COULEURS.map((couleur): EtatCouleur => {
        const p = encres.find((e) => e.couleur === couleur && typeof e.pourcent === 'number')?.pourcent ?? null
        const seuil = seuilDe(m, couleur)
        const points = (niveaux.get(m.id) ?? [])
          .map((n) => ({ t: n.t, p: n.encres.find((e) => e.couleur === couleur && typeof e.pourcent === 'number')?.pourcent }))
          .filter((x): x is { t: number; p: number } => typeof x.p === 'number')
        // le niveau du dernier relevé fait foi pour « maintenant » (le dernier point du jour peut être plus ancien)
        if (p !== null && r) points.push({ t: r.date.getTime(), p })
        const prev = previsionJours(points.filter((x, i, a) => i === a.findIndex((y) => y.t === x.t)))
        const mode: 'duree' | 'pourcent' = prev.fiable ? 'duree' : 'pourcent'
        const bas = p === null ? false : prev.fiable ? prev.jours !== null && prev.jours <= DELAI_ALERTE_JOURS : p <= seuil
        return { couleur, pourcent: p, seuil, bas, jours: prev.fiable ? prev.jours : null, mode, stock: stock[couleur], minimum: minimum[couleur], alerte: bas && stock[couleur] <= minimum[couleur] }
      })
      return {
        id: m.id,
        nom: libelleMachine(m, 'Machine inconnue'),
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
})

/** L'état d'encre par machine (clé : id de la machine), pour l'affichage. */
export async function etatsParMachine(): Promise<Map<number, EtatCouleur[]>> {
  const res = new Map<number, EtatCouleur[]>()
  for (const c of await etatDuParc()) for (const m of c.machines) res.set(m.id, m.couleurs)
  return res
}

export async function clientsEnAlerte(): Promise<ClientEtat[]> {
  return (await etatDuParc()).filter((c) => c.nbAlertes > 0)
}
