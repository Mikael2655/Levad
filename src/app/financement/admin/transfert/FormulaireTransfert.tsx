'use client'

import { useState } from 'react'
import { appel } from '../../appel'

const champ = 'border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition'
interface P { id: number; nom: string }

export default function FormulaireTransfert({ sources, cibles }: { sources: P[]; cibles: P[] }) {
  const [de, setDe] = useState('')
  const [vers, setVers] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  async function transferer(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const a = sources.find(s => String(s.id) === de)?.nom
    const b = cibles.find(s => String(s.id) === vers)?.nom
    if (!a || !b || !confirm(`Transférer tous les contrats de ${a} vers ${b} ?`)) return
    try {
      const r = (await appel('/api/financement/admin/transfert', 'POST', { deId: Number(de), versId: Number(vers) })) as { transferes: number }
      setMessage({ ok: true, texte: `${r.transferes} contrat(s) transféré(s).` })
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message })
    }
  }

  return (
    <form onSubmit={transferer} className="carte p-4 flex flex-wrap items-end gap-3 text-sm">
      <label>De<br /><select className={champ} value={de} onChange={e => setDe(e.target.value)} required><option value="">— choisir —</option>{sources.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></label>
      <label>Vers<br /><select className={champ} value={vers} onChange={e => setVers(e.target.value)} required><option value="">— choisir —</option>{cibles.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></label>
      <button className="bg-accent-700 hover:bg-accent-800 text-white shadow-sm shadow-accent-800/20 transition rounded-lg px-4 py-2 font-semibold">Transférer</button>
      {message && <span className={message.ok ? 'text-green-700' : 'text-red-700'}>{message.texte}</span>}
    </form>
  )
}
