import { prisma } from '@/lib/db'
import { COULEURS, stockDuGroupe, stocksParGroupe } from './alertes'
import { cleGroupe } from './gammes'

// Changements de cartouche détectés d'après l'historique des niveaux d'encre d'une machine.
// Un changement = le niveau d'une couleur remonte d'au moins 25 points et atteint 90 % ou plus d'un relevé au suivant.
// Chaque changement non encore compté retire une cartouche du stock du client, à la date où il a été vu,
// à condition qu'il y ait eu du stock à ce moment-là et que le stock n'ait pas été corrigé à la main depuis.
// Rejouer l'historique à chaque relevé rattrape les changements que la lecture au fil de l'eau aurait manqués.

const JOURS_HISTORIQUE = 90
const TOLERANCE_MS = 3 * 3600 * 1000

type Niveau = { couleur?: string | null; pourcent?: number | null }

export async function rattraperChangements(machine: { id: number; clientId: number; categorie: string; horsContrat: boolean; gamme: string | null; modele: string | null; site: string }) {
  if (machine.categorie !== 'mine' || machine.horsContrat) return
  const groupe = cleGroupe(machine as Parameters<typeof cleGroupe>[0])
  const depuis = new Date(Date.now() - JOURS_HISTORIQUE * 86400000)
  const releves = (await prisma.connectReleve.findMany({ where: { machineId: machine.id, date: { gte: depuis } }, orderBy: { date: 'asc' }, select: { date: true, encres: true } }))
    .filter((r) => Array.isArray(r.encres) && r.encres.length > 0)
  if (releves.length < 2) return

  for (const couleur of COULEURS) {
    const dejaCompte = await prisma.connectStockMouvement.findMany({ where: { machineId: machine.id, couleur, motif: 'changement' }, select: { date: true } })
    const derniereCorrection = await prisma.connectStockMouvement.findFirst({ where: { clientId: machine.clientId, groupe, couleur, motif: 'correction' }, orderBy: { date: 'desc' }, select: { date: true } })
    const niveau = (r: (typeof releves)[number]) => ((r.encres as Niveau[]).find((x) => x.couleur === couleur)?.pourcent ?? null) as number | null
    for (let i = 1; i < releves.length; i++) {
      const avant = niveau(releves[i - 1])
      const apres = niveau(releves[i])
      if (avant === null || apres === null || apres < 90 || apres - avant < 25) continue
      const quand = releves[i].date
      if (derniereCorrection && quand <= derniereCorrection.date) continue
      if (dejaCompte.some((m) => Math.abs(m.date.getTime() - quand.getTime()) <= TOLERANCE_MS)) continue
      // stock de cette couleur au moment du changement : on retire une cartouche de la version la plus abondante
      const lignes = await prisma.connectStockMouvement.groupBy({ by: ['variante'], _sum: { delta: true }, where: { clientId: machine.clientId, groupe, couleur, date: { lte: quand } } })
      let meilleure: string | null = null
      let max = 0
      for (const l of lignes.sort((a, b) => a.variante.localeCompare(b.variante))) {
        const q = l._sum.delta ?? 0
        if (q > max) { max = q; meilleure = l.variante }
      }
      if (meilleure === null) continue
      await prisma.connectStockMouvement.create({
        data: { clientId: machine.clientId, groupe, variante: meilleure, couleur, delta: -1, motif: 'changement', note: `Cartouche changée détectée (niveau passé de ${avant} % à ${apres} %)`, machineId: machine.id, date: quand },
      })
      dejaCompte.push({ date: quand })
    }
  }
}

export type ChangementAVerifier = {
  machineId: number
  clientId: number
  client: string
  machine: { id: number; clientId: number; modele: string | null; nomAffiche: string | null; marque: string | null; numeroSerie: string | null; site: string }
  couleur: string
  quand: Date
  avant: number
  apres: number
  stock: number
}

/**
 * Remplacements de cartouche vus dans les niveaux d'encre mais jamais retirés du stock (il n'y avait pas de stock saisi
 * à ce moment-là), alors qu'il reste du stock aujourd'hui pour cette couleur : la cartouche posée est peut-être celle du stock.
 */
export async function changementsAVerifier(): Promise<ChangementAVerifier[]> {
  const depuis = new Date(Date.now() - JOURS_HISTORIQUE * 86400000)
  const machines = await prisma.connectMachine.findMany({ where: { categorie: 'mine', horsContrat: false }, include: { client: { select: { nom: true } } } })
  if (!machines.length) return []
  const ids = machines.map((m) => m.id)
  const [releves, mouvements, stocks] = await Promise.all([
    prisma.connectReleve.findMany({ where: { machineId: { in: ids }, date: { gte: depuis } }, orderBy: { date: 'asc' }, select: { machineId: true, date: true, encres: true } }),
    prisma.connectStockMouvement.findMany({ where: { OR: [{ motif: 'changement' }, { motif: 'correction' }], date: { gte: new Date(depuis.getTime() - 86400000) } }, select: { clientId: true, groupe: true, couleur: true, motif: true, date: true, machineId: true } }),
    stocksParGroupe(),
  ])
  const parMachine = new Map<number, typeof releves>()
  for (const r of releves) if (Array.isArray(r.encres) && r.encres.length > 0) parMachine.set(r.machineId, [...(parMachine.get(r.machineId) ?? []), r])
  const resultat: ChangementAVerifier[] = []
  for (const m of machines) {
    const rs = parMachine.get(m.id) ?? []
    if (rs.length < 2) continue
    const groupe = cleGroupe(m as Parameters<typeof cleGroupe>[0])
    for (const couleur of COULEURS) {
      const stock = stockDuGroupe(stocks, m.clientId, groupe)[couleur]
      if (stock <= 0) continue
      const correction = mouvements.filter((x) => x.motif === 'correction' && x.clientId === m.clientId && x.groupe === groupe && x.couleur === couleur).sort((a, b) => b.date.getTime() - a.date.getTime())[0]
      const comptes = mouvements.filter((x) => x.motif === 'changement' && x.machineId === m.id && x.couleur === couleur)
      const niveau = (r: (typeof rs)[number]) => ((r.encres as Niveau[]).find((x) => x.couleur === couleur)?.pourcent ?? null) as number | null
      for (let i = 1; i < rs.length; i++) {
        const avant = niveau(rs[i - 1])
        const apres = niveau(rs[i])
        if (avant === null || apres === null || apres < 90 || apres - avant < 25) continue
        const quand = rs[i].date
        if (correction && quand <= correction.date) continue
        if (comptes.some((x) => Math.abs(x.date.getTime() - quand.getTime()) <= TOLERANCE_MS)) continue
        resultat.push({ machineId: m.id, clientId: m.clientId, client: m.client.nom, machine: m, couleur, quand, avant, apres, stock })
      }
    }
  }
  return resultat.sort((a, b) => b.quand.getTime() - a.quand.getTime())
}
