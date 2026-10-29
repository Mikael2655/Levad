'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

export default function BoutonDenonciation({ id, denonce }: { id: number; denonce: boolean }) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
        onClick={async () => {
          if (!denonce && !confirm('Dénoncer ce contrat : il s’arrêtera à son terme au lieu d’être prolongé tacitement d’un an. Confirmer ?')) return
          setErreur(null)
          try { await appel(`/api/financement/contrats/${id}/denonciation`, 'POST', { denonce: !denonce }); router.refresh() } catch (e) { setErreur((e as Error).message) }
        }}
      >
        {denonce ? 'Annuler la dénonciation' : 'Dénoncer le contrat'}
      </button>
      {erreur && <span className="text-red-700">{erreur}</span>}
    </div>
  )
}
