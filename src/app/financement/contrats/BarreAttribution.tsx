'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { appel } from '../appel'

// Barre d'attribution : apparaît dès qu'une case de contrat est cochée dans la liste (les cases sont dans le tableau, côté serveur).
// « Tout sélectionner » coche tous les contrats affichés (donc ceux du filtre en cours).
const cases = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[data-sel-contrat]'))

export default function BarreAttribution({ commerciaux }: { commerciaux: { id: number; nom: string }[] }) {
  const router = useRouter()
  const [n, setN] = useState(0)
  const [vers, setVers] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  useEffect(() => {
    const maj = () => setN(cases().filter(c => c.checked).length)
    const quandChange = (e: Event) => {
      const t = e.target as HTMLInputElement | null
      if (t?.matches?.('input[data-sel-tout]')) cases().forEach(c => { c.checked = t.checked })
      maj()
    }
    document.addEventListener('change', quandChange)
    // la liste peut être rechargée (filtre, tri) : on recompte
    let minuteur: ReturnType<typeof setTimeout>
    const observateur = new MutationObserver(() => { clearTimeout(minuteur); minuteur = setTimeout(maj, 100) })
    observateur.observe(document.body, { childList: true, subtree: true })
    maj()
    return () => { document.removeEventListener('change', quandChange); observateur.disconnect(); clearTimeout(minuteur) }
  }, [])

  const toutDecocher = () => {
    cases().forEach(c => { c.checked = false })
    document.querySelectorAll<HTMLInputElement>('input[data-sel-tout]').forEach(c => { c.checked = false })
    setN(0)
  }

  async function attribuer() {
    const ids = cases().filter(c => c.checked).map(c => Number(c.value))
    const cible = commerciaux.find(c => String(c.id) === vers)
    if (!cible) return setMessage({ ok: false, texte: 'Choisissez le commercial.' })
    if (!confirm(`Attribuer ${ids.length} contrat${ids.length > 1 ? 's' : ''} à ${cible.nom} ? Le montant affiché aux commerciaux est recalculé avec ses taux ; le loyer ne change pas.`)) return
    setEnvoi(true)
    setMessage(null)
    try {
      const r = await appel<{ attribues: number; dejaChezLui: number }>('/api/financement/contrats/attribution', 'POST', { ids, versId: Number(vers) })
      setMessage({ ok: true, texte: `${r.attribues} contrat${r.attribues > 1 ? 's attribués' : ' attribué'} à ${cible.nom}${r.dejaChezLui ? ` (${r.dejaChezLui} l’avai${r.dejaChezLui > 1 ? 'ent' : 't'} déjà)` : ''}.` })
      toutDecocher()
      router.refresh()
    } catch (e) {
      setMessage({ ok: false, texte: (e as Error).message })
    } finally {
      setEnvoi(false)
    }
  }

  if (n === 0 && !message) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl bg-white rounded-2xl ring-1 ring-gray-900/10 shadow-2xl p-3 flex flex-wrap items-center gap-3 text-sm">
      {n > 0 && (
        <>
          <span className="font-semibold text-gray-900">{n} contrat{n > 1 ? 's' : ''} sélectionné{n > 1 ? 's' : ''}</span>
          <label className="flex items-center gap-2">Attribuer à
            <select className="border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400" value={vers} onChange={e => setVers(e.target.value)}>
              <option value="">— choisir —</option>
              {commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </label>
          <button disabled={envoi || !vers} className="bg-leasing-700 hover:bg-leasing-800 text-white rounded-xl px-4 py-2 font-semibold transition disabled:opacity-50" onClick={attribuer}>{envoi ? 'Attribution…' : 'Attribuer'}</button>
          <button className="text-gray-500 underline" onClick={() => { toutDecocher(); setMessage(null) }}>Tout désélectionner</button>
        </>
      )}
      {message && <span className={message.ok ? 'text-emerald-800' : 'text-red-700'}>{message.texte}</span>}
    </div>
  )
}
