'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

const champ = 'border border-gray-300 rounded-lg px-2.5 py-2 text-sm bg-white'

export default function FormulaireNotifications(p: { choix: { id: number; nom: string }[]; signataireLevadId: string; dossierCompletId: string }) {
  const router = useRouter()
  const [signataire, setSignataire] = useState(p.signataireLevadId)
  const [complet, setComplet] = useState(p.dossierCompletId)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const options = <>{<option value="">Administrateur (par défaut)</option>}{p.choix.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</>

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    try {
      await appel('/api/financement/admin/notifications', 'PATCH', { signataireLevadId: signataire, dossierCompletId: complet })
      setMessage({ ok: true, texte: 'Enregistré.' })
      router.refresh()
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message })
    }
  }

  return (
    <form onSubmit={enregistrer} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 text-sm">
      <p className="text-gray-600">Le <b>commercial de la demande</b> reçoit toujours : les retours du financeur (accord, refus, pièces complémentaires), « le client a signé », « confirmation de livraison » et « dossier complet ». Choisissez ici qui reçoit en plus :</p>
      <label className="block">Quand LEVAD doit signer, prévenir<br /><select className={champ} value={signataire} onChange={e => setSignataire(e.target.value)}>{options}</select></label>
      <label className="block">Quand le dossier est complet, prévenir aussi<br /><select className={champ} value={complet} onChange={e => setComplet(e.target.value)}>{options}</select></label>
      <div className="flex items-center gap-3">
        <button className="bg-brand-800 text-white rounded-lg px-4 py-1.5 font-semibold">Enregistrer</button>
        {message && <span className={message.ok ? 'text-green-700' : 'text-red-700'}>{message.texte}</span>}
      </div>
    </form>
  )
}
