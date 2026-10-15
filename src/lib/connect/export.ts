import { comparerNoms } from '@/lib/connect/tri'
import { prisma } from '@/lib/db'
import { calculer, type Compteurs } from '@/lib/connect/calcul'

// Export des totaux (index) à une date choisie : pour chaque machine, le relevé le plus récent à cette date ou avant.

export type ParamsExport = {
  date: string // AAAA-MM-JJ
  date2?: string // date de comparaison (consultation)
  clients: number[]
  machines: number[]
  seuilJours: number
  anciens: 'inclure' | 'exclure'
}

export type LigneExport = {
  machineId: number
  clientId: number
  client: string
  reference: string
  serie: string
  nb: number | null
  couleur: number | null
  scans: number | null
  dateReleve: Date | null
  ageJours: number | null // ancienneté du relevé par rapport à la date choisie
  ancien: boolean // pas de relevé, ou relevé plus vieux que le seuil
  nb2: number | null
  couleur2: number | null
  dateReleve2: Date | null
}

/** Fin de la journée AAAA-MM-JJ à l'heure de Paris (23:59:59). */
export function finDeJournee(jour: string): Date {
  const [a, m, j] = jour.split('-').map(Number)
  const approx = Date.UTC(a, m - 1, j, 23, 59, 59)
  const heureParis = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date(approx)))
  const decalage = (heureParis - 23 + 24) % 24 // 1 (hiver) ou 2 (été)
  return new Date(approx - decalage * 3600000)
}

export function dateValide(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

async function totauxA(machine: { id: number; recette: string | null }, fin: Date) {
  const r = await prisma.connectReleve.findFirst({
    where: { machineId: machine.id, date: { lte: fin } },
    orderBy: { date: 'desc' },
    select: { date: true, compteurs: true },
  })
  if (!r) return null
  const c = (r.compteurs ?? {}) as unknown as Compteurs
  const t = calculer(c, machine.recette).retenue
  return { date: r.date, nb: t?.nb ?? null, couleur: t?.couleur ?? null, scans: typeof c['501']?.v === 'number' ? c['501'].v : null }
}

export async function calculerExport(p: ParamsExport): Promise<LigneExport[]> {
  if (!p.clients.length) return []
  const fin = finDeJournee(p.date)
  const fin2 = p.date2 ? finDeJournee(p.date2) : null
  const machines = (await prisma.connectMachine.findMany({
    where: { clientId: { in: p.clients }, horsContrat: false },
    include: { client: true },
    orderBy: [{ client: { nom: 'asc' } }, { site: 'asc' }, { id: 'asc' }],
  })).sort((a, b) => comparerNoms(a.client.nom, b.client.nom)) // tri stable : site et id restent dans l'ordre
  const voulues = new Set(p.machines)
  const retenues = machines.filter((m) => voulues.has(m.id))
  const lignes = await Promise.all(
    retenues.map(async (m): Promise<LigneExport> => {
      const [a, b] = await Promise.all([totauxA(m, fin), fin2 ? totauxA(m, fin2) : Promise.resolve(null)])
      const age = a ? Math.floor((fin.getTime() - a.date.getTime()) / 86400000) : null
      return {
        machineId: m.id,
        clientId: m.clientId,
        client: m.client.nom,
        reference: m.nomAffiche || m.modele || '',
        serie: m.numeroSerie ?? '',
        nb: a?.nb ?? null,
        couleur: a?.couleur ?? null,
        scans: a?.scans ?? null,
        dateReleve: a?.date ?? null,
        ageJours: age,
        ancien: !a || (age ?? 0) > p.seuilJours,
        nb2: b?.nb ?? null,
        couleur2: b?.couleur ?? null,
        dateReleve2: b?.date ?? null,
      }
    }),
  )
  return p.anciens === 'exclure' ? lignes.filter((l) => !l.ancien) : lignes
}

/** Lit les réglages de l'export dans l'adresse de la page (formulaire en GET). */
export function lireParams(q: Record<string, string | string[] | undefined>): { params: ParamsExport; options: { scans: boolean; dateReleve: boolean } } | null {
  const un = (k: string) => (Array.isArray(q[k]) ? (q[k] as string[])[0] : (q[k] as string | undefined))
  const liste = (k: string) => {
    const v = q[k]
    return (Array.isArray(v) ? v : v ? [v] : []).map(Number).filter((n) => Number.isInteger(n) && n > 0)
  }
  const date = un('date')
  if (!dateValide(date)) return null
  let d2 = un('d2')
  let jour = date
  if (dateValide(d2) && d2 > date) [jour, d2] = [d2, date] // la date principale est toujours la plus récente
  const seuil = Math.min(365, Math.max(1, Math.floor(Number(un('j')) || 10)))
  return {
    params: {
      date: jour,
      date2: dateValide(d2) ? d2 : undefined,
      clients: liste('c'),
      machines: liste('m'),
      seuilJours: seuil,
      anciens: un('anc') === 'exclure' ? 'exclure' : 'inclure',
    },
    options: { scans: un('scans') === '1', dateReleve: un('dr') === '1' },
  }
}
