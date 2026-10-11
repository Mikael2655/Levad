import Link from 'next/link'
import { depuis, formaterDate } from '@/components/connect/affichage'
import { postesDeconnectes, type PosteDeconnecte } from '@/lib/connect/connexion'

export const dynamic = 'force-dynamic'

export default async function DeconnexionsPage() {
  let postes: PosteDeconnecte[]
  try {
    postes = await postesDeconnectes()
  } catch {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">La base de données n&apos;est pas encore prête.</p>
  }
  return (
    <>
      <h1 className="text-2xl font-bold">Alerte déconnexion</h1>
      <p className="mt-1 text-gray-600">
        Ordinateurs (un par site chez le client) dont le programme ne donne plus signe de vie depuis au moins 10 jours (délai
        réglable pour chaque client dans sa fiche).
      </p>
      {postes.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-white p-10 text-center">
          <p className="text-lg font-semibold text-green-700">Aucun ordinateur déconnecté</p>
          <p className="mt-1 text-gray-600">Tous les programmes installés ont donné signe de vie récemment.</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {postes.length} ordinateur{postes.length > 1 ? 's' : ''} déconnecté{postes.length > 1 ? 's' : ''}.
          </p>
          <div className="mt-6 divide-y rounded-xl border bg-white">
            {postes.map((p) => (
              <Link key={p.id} href={`/parc/client/${p.clientId}`} className="grid items-center gap-2 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1.4fr_1.2fr_2fr_0.8fr]">
                <p className="font-semibold">{p.clientNom}</p>
                <p className="text-sm text-gray-600">{p.site} · {p.nom}</p>
                <p className="text-sm text-red-600">
                  Dernier signal : {formaterDate(p.derniere)} ({depuis(p.derniere)})
                </p>
                <p className="text-sm text-gray-500 md:text-right">Délai : {p.seuilJours} jours</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
