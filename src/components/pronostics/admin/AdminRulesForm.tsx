'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminRulesForm({ competitionId, rulesText }: { competitionId: number; rulesText: string | null }) {
  const router = useRouter()
  const [text, setText] = useState(rulesText ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    await fetch(`/api/pronostics/${competitionId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rulesText: text }),
    })
    setLoading(false)
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-6 space-y-3">
      <div>
        <h3 className="font-semibold mb-1">Règlement du tournoi</h3>
        <p className="text-xs text-pitch-400">
          Texte libre affiché sur la page d'accueil de la compétition (règles, lots, dates limites...).
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Ex. Les pronostics sont clos au coup d'envoi de chaque match. Le vainqueur remporte..."
        className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900"
      />
      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition"
      >
        {saved ? 'Enregistré ✓' : loading ? '...' : 'Enregistrer le règlement'}
      </button>
    </div>
  )
}
