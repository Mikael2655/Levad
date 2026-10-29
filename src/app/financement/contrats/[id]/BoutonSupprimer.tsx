'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

export default function BoutonSupprimer({ id, avecDemande }: { id: number; avecDemande: boolean }) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        className="border border-red-300 text-red-700 rounded-lg px-3 py-1.5 bg-white"
        onClick={async () => {
          if (!confirm(`Supprimer définitivement ce contrat${avecDemande ? ', la demande d’origine et son historique' : ''} ? Cette action est irréversible.`)) return
          setErreur(null)
          try { await appel(`/api/financement/contrats/${id}`, 'DELETE'); router.push('/financement/contrats') } catch (e) { setErreur((e as Error).message) }
        }}
      >
        Supprimer le contrat
      </button>
      {erreur && <span className="text-red-700">{erreur}</span>}
    </div>
  )
}
