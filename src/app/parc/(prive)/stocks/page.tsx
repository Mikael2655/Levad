import { prisma } from '@/lib/db'
import { VERT, formaterDate } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR, stocksParClient, stockVide } from '@/lib/connect/alertes'
import { ajouterEnvoi, corrigerStock } from '../actions'

export const dynamic = 'force-dynamic'

const champ = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2'

export default async function StocksPage({ searchParams }: { searchParams: { client?: string } }) {
  let clients, stocks, mouvements
  try {
    clients = await prisma.connectClient.findMany({
      where: { machines: { some: {} } },
      orderBy: { nom: 'asc' },
    })
    stocks = await stocksParClient()
    mouvements = await prisma.connectStockMouvement.findMany({
      orderBy: { date: 'desc' },
      take: 40,
      include: { client: true },
    })
  } catch {
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        La base de données n&apos;est pas encore prête : collez la dernière version du script{' '}
        <code>prisma/migrations/manual_connect_parc.sql</code> dans la console SQL.
      </p>
    )
  }
  const preselection = Number(searchParams.client) || clients[0]?.id

  return (
    <>
      <h1 className="text-2xl font-bold">Stocks d&apos;encre des clients</h1>
      <p className="mt-1 text-gray-600">
        Le stock d&apos;un client augmente à chaque envoi que vous saisissez ici, et baisse tout seul quand le programme
        détecte une cartouche changée (niveau remonté à 100 %). Il ne descend jamais sous zéro.
      </p>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Saisir un envoi de cartouches</h2>
        <form action={ajouterEnvoi} className="mt-4 grid gap-4 md:grid-cols-5">
          <label className="text-sm font-medium text-gray-700 md:col-span-2">
            Client
            <select name="clientId" defaultValue={preselection} className={champ}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Couleur
            <select name="couleur" className={champ}>
              {COULEURS.map((c) => (
                <option key={c} value={c}>{NOM_COULEUR[c]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Quantité
            <input type="number" name="quantite" min={1} defaultValue={1} required className={champ} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Date (facultatif)
            <input type="date" name="date" className={champ} />
          </label>
          <label className="text-sm font-medium text-gray-700 md:col-span-4">
            Référence ou remarque (facultatif)
            <input name="note" placeholder="ex. C-EXV 49 noir" className={champ} />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-lg px-5 py-2.5 font-semibold text-white" style={{ backgroundColor: VERT }}>
              Enregistrer l&apos;envoi
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Stock actuel</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4">Client</th>
                {COULEURS.map((c) => (
                  <th key={c} className="py-2 pr-4 text-right">{NOM_COULEUR[c]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const s = stocks.get(c.id) ?? stockVide()
                return (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{c.nom}</td>
                    {COULEURS.map((k) => (
                      <td key={k} className={`py-2 pr-4 text-right tabular-nums ${s[k] === 0 ? 'text-gray-400' : 'font-semibold'}`}>
                        {s[k]}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Corriger un stock</h2>
        <p className="text-sm text-gray-500">Indiquez la quantité réelle : la différence est enregistrée comme correction.</p>
        <form action={corrigerStock} className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">
            Client
            <select name="clientId" defaultValue={preselection} className={champ}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </label>
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
            <input type="number" name="quantite" min={0} defaultValue={0} required className={champ} />
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
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Couleur</th>
                  <th className="py-2 pr-4 text-right">Quantité</th>
                  <th className="py-2">Détail</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{formaterDate(m.date)}</td>
                    <td className="py-1.5 pr-4">{m.client.nom}</td>
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
