import Link from 'next/link'
import { grilleCommercialePour, grilleReelle, lireGrille, listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { dureesDisponibles } from '@/lib/financement/calcul'
import { exigerUtilisateur } from '@/lib/financement/garde'
import BoutonsGrillePropre from './BoutonsGrillePropre'
import EditeurGrille from './EditeurGrille'

export const dynamic = 'force-dynamic'

const trimestres = (mois: number) => (mois % 3 === 0 ? `${mois / 3}T` : `${mois} mois`)

export default async function PageGrilles({ searchParams }: { searchParams: { f?: string; c?: string } }) {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const financeurs = await listerFinanceurs()
  if (financeurs.length === 0) return <main className="max-w-5xl mx-auto p-6 text-sm text-gray-600">Créez d’abord un financeur.</main>
  const financeur = financeurs.find(f => String(f.id) === searchParams.f) ?? financeurs[0]
  const commerciaux = (await listerUtilisateurs()).filter(u => u.role === 'COMMERCIAL' && u.actif)

  const c = searchParams.c ?? 'commune'
  const utilisateurId = c.startsWith('u') ? Number(c.slice(1)) : null
  const type = c === 'reelle' ? 'REELLE' : 'COMMERCIALE'
  const grille = await lireGrille({ financeurId: financeur.id, type, utilisateurId })

  const reelle = await grilleReelle(financeur.id)
  const commune = await grilleCommercialePour(financeur.id, 0) // 0 : aucun commercial -> barème commun
  const durees = reelle && commune ? dureesDisponibles(reelle, commune) : []

  const lien = (cible: string, texte: string) => (
    <Link key={cible} href={`/financement/admin/grilles?f=${financeur.id}&c=${cible}`} className={`px-3 py-1.5 rounded-lg text-sm border ${c === cible ? 'bg-brand-800 text-white border-brand-800' : 'bg-white border-gray-300 text-gray-700'}`}>{texte}</Link>
  )

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Barèmes</h1>
      <div className="flex flex-wrap gap-2">
        {financeurs.map(f => <Link key={f.id} href={`/financement/admin/grilles?f=${f.id}`} className={`px-3 py-1.5 rounded-lg text-sm border ${f.id === financeur.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}>{f.nom}</Link>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {lien('reelle', 'Barème réel (financeur)')}
        {lien('commune', 'Barème commun des commerciaux')}
        {commerciaux.map(u => lien(`u${u.id}`, `${u.prenom} ${u.nom}`))}
      </div>

      <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2">
        Durées proposables à la saisie (présentes dans les deux barèmes) :{' '}
        <b>{durees.length ? durees.map(d => `${d} mois (${trimestres(d)})`).join(', ') : 'aucune'}</b>
      </p>

      {utilisateurId !== null && !grille ? (
        <BoutonsGrillePropre financeurId={financeur.id} utilisateurId={utilisateurId} aGrille={false} />
      ) : (
        <>
          {utilisateurId !== null && <BoutonsGrillePropre financeurId={financeur.id} utilisateurId={utilisateurId} aGrille />}
          <EditeurGrille
            key={`${financeur.id}-${c}-${grille?.id ?? 'nouvelle'}`}
            cible={{ financeurId: financeur.id, type, utilisateurId }}
            baseInitiale={grille?.base ?? (type === 'REELLE' ? 'MENSUEL' : 'TRIMESTRIEL')}
            matriceInitiale={grille?.matrice ?? null}
          />
        </>
      )}
    </main>
  )
}
