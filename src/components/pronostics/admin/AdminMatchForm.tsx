'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminMatchForm() {
  const router = useRouter()
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/pronostics/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeTeam, awayTeam, kickoff }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la création.')
      return
    }

    setHomeTeam('')
    setAwayTeam('')
    setKickoff('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-end">
      <div className="flex-1 w-full">
        <label className="block text-xs text-pitch-400 mb-1">Équipe à domicile</label>
        <input
          required
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
        />
      </div>
      <div className="flex-1 w-full">
        <label className="block text-xs text-pitch-400 mb-1">Équipe à l'extérieur</label>
        <input
          required
          value={awayTeam}
          onChange={(e) => setAwayTeam(e.target.value)}
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
        />
      </div>
      <div className="w-full sm:w-56">
        <label className="block text-xs text-pitch-400 mb-1">Date et heure du coup d'envoi</label>
        <input
          type="datetime-local"
          required
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-bold px-4 py-2 rounded-lg transition w-full sm:w-auto"
      >
        {loading ? '...' : 'Créer le match'}
      </button>
      {error && <p className="text-xs text-red-300 w-full">{error}</p>}
    </form>
  )
}
