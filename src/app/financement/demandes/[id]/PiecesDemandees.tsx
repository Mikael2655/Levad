'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

const champ = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition'

// Interne : on dépose le PDF reçu de Grenke, l'outil en sort la liste des pièces ; on relit, puis on enregistre : les commerciaux la voient sur la demande.
export default function PiecesDemandees({ demandeId }: { demandeId: number }) {
  const router = useRouter()
  const [texte, setTexte] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  async function analyser(f: File) {
    setErreur(null); setInfo(null); setOccupe(true)
    try {
      const fd = new FormData()
      fd.append('fichier', f)
      const res = await fetch(`/api/financement/demandes/${demandeId}/pieces-demandees`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setTexte((data.lignes as string[]).join('\n'))
      setInfo(!data.texteLu ? 'Ce PDF est une image (scan) : aucun texte lu. Saisissez la liste à la main ci-dessous.' : data.lignes.length === 0 ? 'Aucune pièce reconnue : saisissez la liste à la main ci-dessous.' : 'Vérifiez la liste, corrigez-la si besoin (une pièce par ligne), puis enregistrez.')
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  async function enregistrer() {
    setErreur(null); setOccupe(true)
    try {
      await appel(`/api/financement/demandes/${demandeId}/pieces-demandees`, 'PUT', { lignes: (texte ?? '').split('\n') })
      setTexte(null); setInfo('Liste enregistrée : les commerciaux la voient sur la demande.')
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-600">Pièces demandées par le financeur ?</span>
        <label className={`${champ} cursor-pointer ${occupe ? 'opacity-60' : ''}`}>
          Importer son e-mail (PDF)
          <input type="file" accept="application/pdf" className="hidden" disabled={occupe} onChange={e => { const f = e.target.files?.[0]; if (f) void analyser(f); e.target.value = '' }} />
        </label>
        <button type="button" className="underline text-gray-500" onClick={() => setTexte(texte === null ? '' : null)}>{texte === null ? 'ou saisir la liste' : 'fermer'}</button>
      </div>
      {texte !== null && (
        <div className="space-y-2">
          <textarea className={`${champ} w-full`} rows={6} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Une pièce par ligne : Extrait Kbis de moins de 3 mois…" />
          <button type="button" disabled={occupe || !texte.trim()} onClick={enregistrer} className="bg-accent-700 hover:bg-accent-800 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">Enregistrer : demander ces pièces</button>
        </div>
      )}
      {info && <p className="text-gray-600">{info}</p>}
      {erreur && <p className="text-red-700">{erreur}</p>}
    </div>
  )
}
