'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

interface Ligne { id: number; ref: string; client: string; etat: string }

// Contrats que Grenke dit terminés (relevés par la synchronisation de nuit ou la simulation) : un clic pour valider leur clôture dans l'outil.
export default function ValiderClotures({ lignes }: { lignes: Ligne[] }) {
  const router = useRouter()
  const [choisis, setChoisis] = useState<number[]>(lignes.map(l => l.id))
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  if (lignes.length === 0 && !message) return null

  async function valider() {
    if (choisis.length === 0) return
    if (!window.confirm(`Valider la clôture de ${choisis.length} contrat(s) dans l’outil ? Ils sortiront des contrats en cours. Rien n’est modifié chez Grenke.`)) return
    setErreur(null); setOccupe(true)
    try {
      const r = await appel<{ clotures: number }>('/api/financement/contrats/cloturer', 'POST', { ids: choisis, motif: 'Terminé chez le financeur', confirmation: 'CLOTURER' })
      setMessage(`${r.clotures} contrat(s) clôturé(s).`)
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3 text-sm text-amber-950">
      <h2 className="font-semibold">Contrats terminés chez Grenke : à valider</h2>
      {lignes.length > 0 && (
        <>
          <p>Grenke indique que ces contrats sont terminés. Rien n’est clôturé tant que vous ne validez pas.</p>
          <ul className="space-y-1">{lignes.map(l => (
            <li key={l.id}><label className="flex items-center gap-2"><input type="checkbox" checked={choisis.includes(l.id)} onChange={e => setChoisis(c => (e.target.checked ? [...c, l.id] : c.filter(i => i !== l.id)))} /> <a className="underline" target="_blank" rel="noreferrer" href={`/financement/contrats/${l.id}`}>{l.ref} · {l.client}</a> <span className="text-amber-800">({l.etat})</span></label></li>
          ))}</ul>
          <button type="button" disabled={occupe || choisis.length === 0} onClick={valider} className="bg-accent-700 hover:bg-accent-800 text-white rounded-xl px-4 py-2 font-semibold disabled:opacity-50">Valider la clôture ({choisis.length})</button>
        </>
      )}
      {message && <p className="text-emerald-800">{message}</p>}
      {erreur && <p className="text-red-700">{erreur}</p>}
    </section>
  )
}
