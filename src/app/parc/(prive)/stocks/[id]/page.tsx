import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Encres, VERT, formaterDate, depuis, type Encre } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR, seuilDe, stocksParClient, stockVide } from '@/lib/connect/alertes'
import { ajouterEnvoi, corrigerStock } from '../../actions'

export const dynamic = 'force-dynamic'

const champ = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2'

export default async function StockClientPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string } }) {
  const client = await prisma.connectClient.findUnique({
    where: { id: Number(params.id) },
    include: {
      machines: {
        where: { categorie: 'mine', horsContrat: false },
        orderBy: { creeLe: 'asc' },
        include: { releves: { orderBy: { date: 'desc' }, take: 1 } },
      },
    },
  })
  if (!client) notFound()
  const stock = (await stocksParClient()).get(client.id) ?? stockVide()
  const mouvements = await prisma.connectStockMouvement.findMany({ where: { clientId: client.id }, orderBy: { date: 'desc' }, take: 30 })

  return (
    <>
      <Link href="/parc/stocks" className="text-sm text-gray-500 hover:text-gray-900">← Stock actuel de tous les clients</Link>
      <h1 className="mt-3 text-2xl font-bold">{client.nom}</h1>
      {searchParams.ok && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">Envoi enregistré.</p>}

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Niveaux d&apos;encre des machines</h2>
        {client.machines.length === 0 ? (
          <p className="mt-2 text-gray-600">Aucune machine suivie pour ce client.</p>
        ) : (
          <div className="mt-3 divide-y">
            {client.machines.map((m) => {
              const r = m.releves[0]
              return (
                <Link key={m.id} href={`/parc/machine/${m.id}`} className="grid items-center gap-3 py-3 hover:bg-gray-50 md:grid-cols-[1.2fr_2fr_1fr]">
                  <p className="font-semibold">{m.nomAffiche || m.modele || 'Machine inconnue'}</p>
                  <Encres
                    encres={(r?.encres ?? []) as unknown as Encre[]}
                    seuils={Object.fromEntries(COULEURS.map((c) => [c, seuilDe(m, c)]))}
                    stock={stock}
                  />
                  <p className="text-sm text-gray-500 md:text-right">{r ? `Relevé ${depuis(r.date)}` : 'Jamais lu'}</p>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Stock actuel chez ce client</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COULEURS.map((c) => (
            <div key={c} className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-sm text-gray-500">{NOM_COULEUR[c]}</p>
              <p className={`text-2xl font-bold ${stock[c] === 0 ? 'text-gray-400' : ''}`}>{stock[c]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Saisir un envoi de cartouches</h2>
        <p className="text-sm text-gray-500">Indiquez la quantité de chaque couleur envoyée (0 ou vide = aucune).</p>
        <form action={ajouterEnvoi} className="mt-4 space-y-4">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {COULEURS.map((c) => (
              <label key={c} className="text-sm font-medium text-gray-700">
                {NOM_COULEUR[c]}
                <input type="number" inputMode="numeric" name={`qte_${c}`} min={0} defaultValue={0} className={champ} />
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-gray-700 md:col-span-2">
              Référence ou remarque (facultatif)
              <input name="note" placeholder="ex. C-EXV 49" className={champ} />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Date (facultatif)
              <input type="date" name="date" className={champ} />
            </label>
          </div>
          <button className="rounded-lg px-5 py-2.5 font-semibold text-white" style={{ backgroundColor: VERT }}>
            Enregistrer l&apos;envoi
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Corriger le stock</h2>
        <p className="text-sm text-gray-500">Indiquez la quantité réelle : la différence est enregistrée comme correction.</p>
        <form action={corrigerStock} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="clientId" value={client.id} />
          <label className="text-sm font-medium text-gray-700">
            Couleur
            <select name="couleur" className={champ}>
              {COULEURS.map((c) => (
                <option key={c} value={c}>{NOM_COULEUR[c]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Quantité réelle
            <input type="number" inputMode="numeric" name="quantite" min={0} defaultValue={0} required className={champ} />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-lg border border-gray-300 px-5 py-2.5 font-semibold">Corriger</button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Derniers mouvements</h2>
        {mouvements.length === 0 ? (
          <p className="mt-2 text-gray-600">Aucun mouvement pour l&apos;instant.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Couleur</th>
                  <th className="py-2 pr-4 text-right">Quantité</th>
                  <th className="py-2">Détail</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{formaterDate(m.date)}</td>
                    <td className="py-1.5 pr-4">{NOM_COULEUR[m.couleur as keyof typeof NOM_COULEUR] ?? m.couleur}</td>
                    <td className={`py-1.5 pr-4 text-right tabular-nums ${m.delta > 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="py-1.5 text-gray-600">
                      {{ envoi: 'Envoi', correction: 'Correction', changement: 'Cartouche changée' }[m.motif] ?? m.motif}
                      {m.note ? ` — ${m.note}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
