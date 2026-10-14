import Link from 'next/link'
import { depuis, formaterDate } from '@/components/connect/affichage'
import { postesEnRetard, type PosteEnRetard } from '@/lib/connect/connexion'

export const dynamic = 'force-dynamic'

export default async function DeconnexionsPage() {
  let postes: PosteEnRetard[]
  try {
    postes = (await postesEnRetard()).sort((a, b) => Number(b.niveau === 'rouge') - Number(a.niveau === 'rouge') || a.derniere.getTime() - b.derniere.getTime())
  } catch {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">La base de données n&apos;est pas encore prête.</p>
  }
  return (
    <>
      <h1 className="text-2xl font-bold">Alerte déconnexion</h1>
      <p className="mt-1 text-gray-600">
        Ordinateurs (un par site chez le client) dont le programme ne donne plus signe de vie.
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-600">
        <li><span className="font-semibold text-orange-600">Orange</span> : 3 jours ou plus sans signal. Simple avertissement, pas de mail.</li>
        <li><span className="font-semibold text-red-600">Rouge</span> : 10 jours ou plus (délai réglable pour chaque client dans sa fiche). Un mail d&apos;alerte est envoyé.</li>
      </ul>
      {postes.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-white p-10 text-center">
          <p className="text-lg font-semibold text-green-700">Aucun ordinateur en retard</p>
          <p className="mt-1 text-gray-600">Tous les programmes installés ont donné signe de vie depuis moins de 3 jours.</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {postes.filter((p) => p.niveau === 'rouge').length} en rouge, {postes.filter((p) => p.niveau === 'orange').length} en orange.
          </p>
          <div className="mt-6 divide-y rounded-xl border bg-white">
            {postes.map((p) => (
              <Link key={p.id} href={`/parc/client/${p.clientId}`} className={`grid items-center gap-2 border-l-4 px-5 py-4 md:grid-cols-[1.4fr_1.2fr_2fr_0.8fr] ${p.niveau === 'rouge' ? 'border-red-500 hover:bg-red-50' : 'border-orange-400 hover:bg-orange-50'}`}>
                <p className="font-semibold">{p.clientNom}</p>
                <p className="text-sm text-gray-600">{p.site} · {p.nom}</p>
                <p className={`text-sm ${p.niveau === 'rouge' ? 'text-red-600' : 'text-orange-600'}`}>
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
