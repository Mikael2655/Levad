'use client'

import { useEffect, useState } from 'react'
import { liensVerification, type Entreprise } from '@/lib/financement/entreprises'
import { appel } from '../appel'

// Recherche par nom, adresse ou numéro : suggère les sociétés correspondantes ; l'utilisateur choisit la bonne.
export default function RechercheEntreprise({ onChoisir, siren }: { onChoisir: (e: Entreprise) => void; siren: string }) {
  const [q, setQ] = useState('')
  const [resultats, setResultats] = useState<Entreprise[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [attente, setAttente] = useState(false)

  useEffect(() => {
    if (q.trim().length < 3) {
      setResultats(null)
      setErreur(null)
      return
    }
    let annule = false
    setAttente(true)
    const t = setTimeout(async () => {
      try {
        const r = await appel<Entreprise[]>(`/api/financement/entreprises?q=${encodeURIComponent(q.trim())}`, 'GET')
        if (!annule) { setResultats(r); setErreur(null) }
      } catch (e) {
        if (!annule) { setResultats(null); setErreur((e as Error).message) }
      } finally {
        if (!annule) setAttente(false)
      }
    }, 400)
    return () => { annule = true; clearTimeout(t) }
  }, [q])

  const liens = siren.length >= 9 ? liensVerification(siren.slice(0, 9)) : null

  return (
    <div className="space-y-2">
      <input
        className="w-full border border-brand-800/40 bg-blue-50/40 rounded-xl px-3 py-2.5 text-sm"
        placeholder="🔎 Rechercher l’entreprise : nom, adresse ou SIREN (ex. « Dupont Menuiserie Strasbourg »)"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {attente && <p className="text-xs text-gray-400">Recherche…</p>}
      {erreur && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{erreur}</p>}
      {resultats && resultats.length === 0 && !attente && <p className="text-sm text-gray-500">Aucune société active trouvée. Essayez avec la ville, ou saisissez à la main.</p>}
      {resultats && resultats.length > 0 && (
        <ul className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white max-h-80 overflow-y-auto">
          {resultats.map(e => (
            <li key={e.siren}>
              <button type="button" className="w-full text-left px-3 py-2 hover:bg-blue-50" onClick={() => { onChoisir(e); setQ(''); setResultats(null) }}>
                <span className="font-medium text-gray-900">{e.nom}</span>
                {e.formeJuridique && <span className="text-gray-500"> · {e.formeJuridique}</span>}
                <span className="block text-sm text-gray-600">{[e.adresse, `${e.codePostal} ${e.ville}`.trim()].filter(Boolean).join(', ')}</span>
                <span className="block text-xs text-gray-400">SIREN {e.siren}{e.nbEtablissements > 1 ? ` · ${e.nbEtablissements} établissements (adresse du siège)` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {liens && (
        <p className="text-xs text-gray-500">
          Vérifier sur : <a className="underline" target="_blank" rel="noreferrer" href={liens.pappers}>Pappers</a> ·{' '}
          <a className="underline" target="_blank" rel="noreferrer" href={liens.societe}>Société.com</a> ·{' '}
          <a className="underline" target="_blank" rel="noreferrer" href={liens.infogreffe}>Infogreffe</a>
        </p>
      )}
    </div>
  )
}
