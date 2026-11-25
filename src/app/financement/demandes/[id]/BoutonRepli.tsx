'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

// Crée la même demande chez le financeur de repli (Solubail) : envoyée par e-mail, reliée à la demande d'origine.
export default function BoutonRepli({ demandeId, financeur, libelle }: { demandeId: number; financeur: string; libelle: string }) {
  const router = useRouter()
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function creer() {
    if (!window.confirm(`Créer la même demande chez ${financeur} ? Elle leur sera envoyée par e-mail. La demande actuelle reste ouverte : annulez l’une des deux quand l’autre obtient l’accord.`)) return
    setErreur(null); setOccupe(true)
    try {
      const r = await appel<{ id: number; envoi: string; message?: string }>(`/api/financement/demandes/${demandeId}/repli`, 'POST', {})
      router.push(`/financement/demandes/${r.id}${r.envoi === 'erreur' ? `?envoi=erreur&f=${encodeURIComponent(financeur)}&m=${encodeURIComponent((r.message ?? '').slice(0, 400))}` : `?envoi=ok&f=${encodeURIComponent(financeur)}`}`)
    } catch (e) {
      setErreur((e as Error).message)
      setOccupe(false)
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" disabled={occupe} onClick={creer} className="bg-sky-700 hover:bg-sky-800 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">{occupe ? 'Création…' : libelle}</button>
      {erreur && <p className="text-sm text-red-700">{erreur}</p>}
    </div>
  )
}
