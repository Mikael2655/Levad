'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

export default function BoutonsGrillePropre({ financeurId, utilisateurId, aGrille }: { financeurId: number; utilisateurId: number; aGrille: boolean }) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  async function agir(methode: 'POST' | 'DELETE') {
    setErreur(null)
    try {
      await appel('/api/financement/admin/grilles', methode, { financeurId, utilisateurId })
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    }
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center gap-3">
      {aGrille ? (
        <>
          <span className="text-gray-600">Ce commercial a son propre barème.</span>
          <button className="underline text-red-700" onClick={() => confirm('Supprimer son barème propre ? Il utilisera le barème commun.') && agir('DELETE')}>Supprimer et revenir au barème commun</button>
        </>
      ) : (
        <>
          <span className="text-gray-600">Ce commercial utilise le barème commun.</span>
          <button className="bg-brand-800 text-white rounded-lg px-3 py-1.5 font-semibold" onClick={() => agir('POST')}>Créer un barème propre (copie du commun)</button>
        </>
      )}
      {erreur && <span className="text-red-600">{erreur}</span>}
    </div>
  )
}
