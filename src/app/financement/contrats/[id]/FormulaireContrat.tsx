'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

const champ = 'w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm bg-white'

export default function FormulaireContrat(p: { id: number; commercialId: number; commerciaux: { id: number; nom: string }[]; materiel: string; refFinanceur: string; dateDebut: string; dateFin: string }) {
  const router = useRouter()
  const [v, setV] = useState({ ...p, commercialId: String(p.commercialId) })
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    try {
      await appel(`/api/financement/contrats/${p.id}`, 'PATCH', {
        commercialId: Number(v.commercialId),
        materiel: v.materiel,
        refFinanceur: v.refFinanceur,
        dateDebut: v.dateDebut,
        // si seul le 1er loyer a changé, la fin est recalculée (1er loyer + durée)
        ...(v.dateFin !== p.dateFin || !v.dateDebut ? { dateFin: v.dateFin } : {}),
      })
      setMessage({ ok: true, texte: 'Contrat mis à jour.' })
      router.refresh()
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message })
    }
  }

  return (
    <form onSubmit={enregistrer} className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Corriger le contrat</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2"><span className="text-xs text-gray-600">Commercial (changer le commercial recalcule le montant avec sa grille ; le loyer ne change pas)</span>
          <select className={champ} value={v.commercialId} onChange={e => setV({ ...v, commercialId: e.target.value })}>
            {p.commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </label>
        <label className="text-sm"><span className="text-xs text-gray-600">Date du 1er loyer</span><input type="date" className={champ} value={v.dateDebut} onChange={e => setV({ ...v, dateDebut: e.target.value })} /></label>
        <label className="text-sm"><span className="text-xs text-gray-600">Date de fin (calculée = 1er loyer + durée, modifiable)</span><input type="date" className={champ} value={v.dateFin} onChange={e => setV({ ...v, dateFin: e.target.value })} /></label>
        <label className="text-sm"><span className="text-xs text-gray-600">N° de contrat chez le financeur</span><input className={champ} value={v.refFinanceur} onChange={e => setV({ ...v, refFinanceur: e.target.value })} /></label>
        <label className="text-sm sm:col-span-2"><span className="text-xs text-gray-600">Matériel</span><input className={champ} value={v.materiel} onChange={e => setV({ ...v, materiel: e.target.value })} /></label>
      </div>
      {message && <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-700'}`}>{message.texte}</p>}
      <button className="bg-leasing-700 text-white rounded-xl px-5 py-2 text-sm font-semibold">Enregistrer</button>
    </form>
  )
}
