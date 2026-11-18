import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { libelleMachine } from '@/lib/connect/libelle'
import { COULEURS, NOM_COULEUR } from '@/lib/connect/alertes'
import { avecEncres } from '@/lib/connect/releves'

export const dynamic = 'force-dynamic'

// Niveaux d'encre des 30 derniers jours : pour chaque jour, le premier et le dernier relevé (le dernier suit la journée en cours) ;
// un clic sur un jour montre tous ses relevés heure par heure.

const TEINTE: Record<string, string> = { noir: '#374151', cyan: '#06b6d4', magenta: '#d946ef', jaune: '#eab308' }
const JOURS = 30
const jourDe = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) // AAAA-MM-JJ
const heureDe = (d: Date) => d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
const jourFr = (j: string) => new Date(`${j}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit' })

type Niveaux = Partial<Record<(typeof COULEURS)[number], number | null>>
type Ligne = { date: Date; niveaux: Niveaux }

function niveauxDe(encres: unknown): Niveaux {
  const liste = Array.isArray(encres) ? (encres as { couleur?: string | null; pourcent?: number | null }[]) : []
  const res: Niveaux = {}
  for (const c of COULEURS) {
    const e = liste.find((x) => x.couleur === c)
    res[c] = typeof e?.pourcent === 'number' ? e.pourcent : null
  }
  return res
}

function Cellule({ niveaux }: { niveaux: Niveaux }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {COULEURS.map((c) => {
        const v = niveaux[c]
        return (
          <div key={c} className="min-w-[3.5rem]">
            <div className="h-1.5 rounded-full bg-gray-200">{typeof v === 'number' && <div className="h-1.5 rounded-full" style={{ width: `${v}%`, backgroundColor: TEINTE[c] }} />}</div>
            <p className={`mt-0.5 text-xs tabular-nums ${typeof v === 'number' && v <= 10 ? 'font-semibold text-red-600' : 'text-gray-700'}`}>{typeof v === 'number' ? `${v} %` : '—'}</p>
          </div>
        )
      })}
    </div>
  )
}

export default async function NiveauxPage({ params, searchParams }: { params: { id: string }; searchParams: { jour?: string } }) {
  const machine = await prisma.connectMachine.findUnique({ where: { id: Number(params.id) }, include: { client: true } })
  if (!machine) notFound()
  const depuis = new Date(Date.now() - (JOURS + 1) * 86400000)
  const releves = await prisma.connectReleve.findMany({
    where: { machineId: machine.id, date: { gte: depuis }, NOT: { encres: { equals: Prisma.DbNull } } },
    orderBy: { date: 'asc' },
    select: { date: true, encres: true },
  })
  const lignes: Ligne[] = releves.filter((r) => avecEncres([r])).map((r) => ({ date: r.date, niveaux: niveauxDe(r.encres) }))
  const parJour = new Map<string, Ligne[]>()
  for (const l of lignes) parJour.set(jourDe(l.date), [...(parJour.get(jourDe(l.date)) ?? []), l])
  const limite = jourDe(new Date(Date.now() - (JOURS - 1) * 86400000))
  const jours = Array.from(parJour.keys()).filter((j) => j >= limite).sort().reverse()
  const choisi = searchParams.jour && parJour.has(searchParams.jour) && searchParams.jour >= limite ? searchParams.jour : null

  return (
    <>
      <Link href={`/parc/machine/${machine.id}`} className="text-sm text-gray-500 hover:text-gray-900">← Retour à la machine</Link>
      <h1 className="mt-3 text-2xl font-bold">Niveaux précédents</h1>
      <p className="mt-1 text-gray-600">
        {machine.client.nom} — {libelleMachine(machine, 'Machine inconnue')} · {JOURS} derniers jours
      </p>

      {jours.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-white p-6 text-gray-600">Aucun niveau d&apos;encre relevé sur les {JOURS} derniers jours.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-2">Jour</th>
                <th className="px-4 py-2">
                  Premier relevé
                  <span className="ml-3 hidden text-xs font-normal sm:inline">{COULEURS.map((c) => NOM_COULEUR[c]).join(' · ')}</span>
                </th>
                <th className="px-4 py-2">Dernier relevé</th>
              </tr>
            </thead>
            <tbody>
              {jours.map((j) => {
                const l = parJour.get(j)!
                const premier = l[0]
                const dernier = l[l.length - 1]
                return (
                  <tr key={j} className={`border-b last:border-0 ${choisi === j ? 'bg-gray-50' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-2 font-medium">
                      <Link href={`?jour=${j}#detail`} className="underline" title="Voir tous les relevés de ce jour">{jourFr(j)}</Link>
                      <span className="ml-1 text-xs font-normal text-gray-400">({l.length})</span>
                    </td>
                    <td className="px-4 py-2">
                      <p className="mb-1 text-xs text-gray-500">{heureDe(premier.date)}</p>
                      <Cellule niveaux={premier.niveaux} />
                    </td>
                    <td className="px-4 py-2">
                      {l.length > 1 ? (
                        <>
                          <p className="mb-1 text-xs text-gray-500">{heureDe(dernier.date)}</p>
                          <Cellule niveaux={dernier.niveaux} />
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Un seul relevé ce jour-là</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <section id="detail" className="mt-6 scroll-mt-4">
        {choisi ? (
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-bold">Relevés du {jourFr(choisi)}, heure par heure</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {parJour.get(choisi)!.map((l) => (
                  <tr key={l.date.getTime()} className="border-b last:border-0">
                    <td className="whitespace-nowrap py-1.5 pr-4 text-gray-500">{heureDe(l.date)}</td>
                    <td className="py-1.5"><Cellule niveaux={l.niveaux} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="?" className="mt-3 inline-block text-sm text-gray-500 underline">Fermer</Link>
          </div>
        ) : (
          jours.length > 0 && <p className="text-sm text-gray-500">Cliquez sur un jour pour voir tous ses relevés, heure par heure.</p>
        )}
      </section>
    </>
  )
}
