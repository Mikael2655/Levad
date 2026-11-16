'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

// À côté de la liste des pièces demandées : une fois les pièces ajoutées, « Envoyer » les transmet au financeur et remet la demande en attente.
export default function BoutonPiecesEnvoyees({ demandeId, nbPieces }: { demandeId: number; nbPieces: number }) {
  const router = useRouter()
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function envoyer() {
    if (nbPieces === 0 && !confirm('Aucune pièce n’a été ajoutée dans l’outil. Confirmez-vous les avoir transmises autrement (e-mail, portail du financeur) ?')) return
    setErreur(null); setOccupe(true)
    try {
      await appel(`/api/financement/demandes/${demandeId}/pieces-envoyees`, 'POST', {})
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
      setOccupe(false)
    }
  }

  return (
    <div className="pt-1">
      <button type="button" disabled={occupe} onClick={envoyer} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60">{occupe ? 'Envoi…' : 'Envoyer'}</button>
      {erreur && <p className="mt-2 text-red-700">{erreur}</p>}
    </div>
  )
}
