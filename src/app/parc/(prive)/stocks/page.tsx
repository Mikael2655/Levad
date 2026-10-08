import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { COULEURS, NOM_COULEUR, stocksParClient, stockVide } from '@/lib/connect/alertes'

export const dynamic = 'force-dynamic'

export default async function StocksPage({ searchParams }: { searchParams: { client?: string } }) {
  if (Number(searchParams.client)) redirect(`/parc/stocks/${Number(searchParams.client)}`)
  let clients, stocks
  try {
    clients = await prisma.connectClient.findMany({ where: { machines: { some: {} } }, orderBy: { nom: 'asc' } })
    stocks = await stocksParClient()
  } catch {
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        La base de données n&apos;est pas encore prête : collez la dernière version du script{' '}
        <code>prisma/migrations/manual_connect_parc.sql</code> dans la console SQL.
      </p>
    )
  }
  return (
    <section className="rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Stock actuel</h1>
      <p className="mt-1 text-sm text-gray-500">Cartouches en stock chez chaque client. Cliquez sur un client pour saisir un envoi ou corriger son stock.</p>
      <div className="mt-4 overflow-x-auto">
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
                  <td className="py-2 pr-4 font-medium">
                    <Link href={`/parc/stocks/${c.id}`} className="underline">{c.nom}</Link>
                  </td>
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
  )
}
