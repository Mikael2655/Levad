import Link from 'next/link'
import { depuis, formaterDate } from '@/components/connect/affichage'
import { clientsDeconnectes, type ClientDeconnecte } from '@/lib/connect/connexion'

export const dynamic = 'force-dynamic'

export default async function DeconnexionsPage() {
  let clients: ClientDeconnecte[]
  try {
    clients = await clientsDeconnectes()
  } catch {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">La base de données n&apos;est pas encore prête.</p>
  }
  return (
    <>
      <h1 className="text-2xl font-bold">Alerte déconnexion</h1>
      <p className="mt-1 text-gray-600">
        Clients dont le programme installé ne donne plus signe de vie depuis au moins 10 jours (délai réglable pour chaque
        client dans sa fiche).
      </p>
      {clients.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-white p-10 text-center">
          <p className="text-lg font-semibold text-green-700">Aucun client déconnecté</p>
          <p className="mt-1 text-gray-600">Tous les programmes installés ont donné signe de vie récemment.</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {clients.length} client{clients.length > 1 ? 's' : ''} déconnecté{clients.length > 1 ? 's' : ''}.
          </p>
          <div className="mt-6 divide-y rounded-xl border bg-white">
            {clients.map((c) => (
              <Link key={c.id} href={`/parc/client/${c.id}`} className="grid items-center gap-2 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1.4fr_2fr_1fr]">
                <p className="font-semibold">{c.nom}</p>
                <p className="text-sm text-red-600">
                  Dernier signal : {formaterDate(c.derniere)} ({depuis(c.derniere)})
                </p>
                <p className="text-sm text-gray-500 md:text-right">
                  Délai : {c.seuilJours} jours{c.nbPostes > 1 ? ` · ${c.nbPostes} ordinateurs` : ''}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
