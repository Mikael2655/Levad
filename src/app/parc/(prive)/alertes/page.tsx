import Link from 'next/link'
import { Badge, Encres, depuis, formaterDate } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR, clientsEnAlerte, type ClientEtat, type MachineEtat } from '@/lib/connect/alertes'

export const dynamic = 'force-dynamic'

function LigneMachine({ m, client }: { m: MachineEtat; client: ClientEtat }) {
  const encres = m.couleurs.map((c) => ({ couleur: c.couleur, pourcent: c.pourcent }))
  const seuils = Object.fromEntries(m.couleurs.map((c) => [c.couleur, c.seuil]))
  return (
    <Link href={`/parc/machine/${m.id}`} className="grid items-center gap-4 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1.2fr_2fr_1fr]">
      <div>
        <p className="font-semibold">{m.nom}</p>
        {m.enAlerte ? (
          <p className="mt-1 text-sm font-semibold text-red-600">
            {m.couleurs
              .filter((c) => c.alerte)
              .map((c) => `${NOM_COULEUR[c.couleur]} ${c.pourcent} %`)
              .join(' · ')}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">Pas d&apos;alerte sur cette machine</p>
        )}
      </div>
      <Encres encres={encres} seuils={seuils} stock={client.stock} />
      <p className="text-sm text-gray-500 md:text-right" title={m.dernierReleve ? formaterDate(m.dernierReleve) : undefined}>
        {m.dernierReleve ? `Relevé ${depuis(m.dernierReleve)}` : 'Jamais lu'}
      </p>
    </Link>
  )
}

export default async function AlertesPage() {
  let clients: ClientEtat[]
  try {
    clients = await clientsEnAlerte()
  } catch {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">La base de données n&apos;est pas encore prête.</p>
  }
  const nbMachines = clients.reduce((n, c) => n + c.nbAlertes, 0)
  return (
    <>
      <h1 className="text-2xl font-bold">Alerte encre</h1>
      <p className="mt-1 text-gray-600">
        Un client est en alerte pour une couleur quand son niveau est sous le seuil <strong>et</strong> qu&apos;il n&apos;a
        plus de cartouche de cette couleur en stock. Seules les machines Canon suivies par LEVAD sont concernées.
      </p>

      {clients.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-white p-10 text-center">
          <p className="text-lg font-semibold text-green-700">Aucun client en alerte</p>
          <p className="mt-1 text-gray-600">Tous les niveaux sont au-dessus du seuil, ou couverts par du stock.</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {clients.length} client{clients.length > 1 ? 's' : ''}, {nbMachines} machine{nbMachines > 1 ? 's' : ''} en alerte.
          </p>
          <div className="mt-6 space-y-8">
            {clients.map((c) => (
              <section key={c.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{c.nom}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-gray-500">
                      Stock : {COULEURS.map((k) => `${NOM_COULEUR[k]} ${c.stock[k]}`).join(' · ')}
                    </span>
                    <Link href={`/parc/stocks/${c.id}`} className="rounded-lg bg-gray-900 px-3 py-1.5 font-semibold text-white">
                      Saisir un envoi
                    </Link>
                  </div>
                </div>
                <div className="divide-y rounded-xl border bg-white">
                  {[...c.machines].sort((a, b) => Number(b.enAlerte) - Number(a.enAlerte)).map((m) => (
                    <LigneMachine key={m.id} m={m} client={c} />
                  ))}
                </div>
                {c.machines.some((m) => !m.enAlerte) && (
                  <p className="mt-2 text-xs text-gray-500">
                    <Badge>Info</Badge> Les autres machines du client sont affichées pour pouvoir grouper une livraison.
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}
