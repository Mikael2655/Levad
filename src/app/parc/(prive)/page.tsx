import Link from 'next/link'
import { prisma } from '@/lib/db'
import { calculer, type Compteurs } from '@/lib/connect/calcul'
import { Badge, Encres, depuis, nombre, type Encre } from '@/components/connect/affichage'

export const dynamic = 'force-dynamic'

export default async function ParcPage() {
  let clients
  try {
    clients = await prisma.connectClient.findMany({
      where: { machines: { some: {} } },
      orderBy: { nom: 'asc' },
      include: {
        machines: { orderBy: { creeLe: 'asc' }, include: { releves: { orderBy: { date: 'desc' }, take: 1 } } },
      },
    })
  } catch {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-lg font-bold">La base de données n&apos;est pas encore prête</h1>
        <p className="mt-2 text-gray-700">
          Collez une seule fois le script <code>prisma/migrations/manual_connect_parc.sql</code> dans la console SQL de
          votre base (Vercel, Storage, votre base, SQL Editor), puis rechargez cette page.
        </p>
      </div>
    )
  }

  const machines = clients.flatMap((c) => c.machines.map((m) => ({ ...m, client: c })))
  const enAlerte = machines.filter((m) => {
    if (m.categorie !== 'mine') return false
    const encres = (m.releves[0]?.encres ?? []) as unknown as Encre[]
    return encres.some((e) => e.pourcent !== null && e.pourcent <= m.seuilEncre)
  })
  const aConfigurer = machines.filter(
    (m) => m.categorie === 'mine' && m.releves[0] && calculer((m.releves[0].compteurs ?? {}) as unknown as Compteurs).aConfigurer
  )

  return (
    <>
      <h1 className="text-2xl font-bold">Parc des clients</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        {[
          ['Clients', clients.length],
          ['Machines', machines.length],
          ['Niveaux d’encre bas', enAlerte.length],
          ['Compteurs à configurer', aConfigurer.length],
        ].map(([titre, valeur]) => (
          <div key={String(titre)} className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">{titre}</p>
            <p className="mt-1 text-3xl font-bold">{valeur}</p>
          </div>
        ))}
      </div>

      {machines.length === 0 && (
        <p className="mt-10 rounded-xl border bg-white p-8 text-center text-gray-600">
          Aucune machine pour l&apos;instant. Elles apparaîtront ici dès qu&apos;un client aura lancé Levad Connect.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {clients.map((c) => (
          <section key={c.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{c.nom}</h2>
              <Link href={`/parc/client/${c.id}`} className="text-sm text-gray-500 hover:text-gray-900">
                Modifier le nom
              </Link>
            </div>
            <div className="divide-y rounded-xl border bg-white">
              {c.machines.map((m) => {
                const r = m.releves[0]
                const compteurs = (r?.compteurs ?? {}) as unknown as Compteurs
                const calc = calculer(compteurs, m.recette)
                const suivie = m.categorie === 'mine'
                return (
                  <Link
                    key={m.id}
                    href={`/parc/machine/${m.id}`}
                    className="grid items-center gap-4 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1.4fr_1.6fr_1fr_0.7fr]"
                  >
                    <div>
                      <p className="font-semibold">{m.nomAffiche || m.modele || 'Machine inconnue'}</p>
                      <p className="text-sm text-gray-500">
                        {m.marque ?? '?'} · n° {m.numeroSerie ?? '—'} · {m.ip ?? '—'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {!suivie && <Badge>Autre marque</Badge>}
                        {m.aVerifier && <Badge ton="orange">À vérifier</Badge>}
                        {suivie && r && calc.aConfigurer && <Badge ton="orange">Compteurs à configurer</Badge>}
                      </div>
                    </div>
                    <div>
                      {suivie ? (
                        <Encres encres={(r?.encres ?? []) as unknown as Encre[]} seuil={m.seuilEncre} alerte />
                      ) : (
                        <p className="text-sm text-gray-400">Pas de suivi d’encre</p>
                      )}
                    </div>
                    <div className="text-sm">
                      {suivie && calc.retenue ? (
                        <>
                          <p>N&amp;B <strong>{nombre(calc.retenue.nb)}</strong></p>
                          <p>Couleur <strong>{nombre(calc.retenue.couleur)}</strong></p>
                        </>
                      ) : (
                        <p>Total <strong>{nombre(r?.totalStandard)}</strong></p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 md:text-right">{r ? depuis(r.date) : 'jamais lu'}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
