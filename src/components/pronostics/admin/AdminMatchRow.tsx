'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: number
  homeTeam: string
  awayTeam: string
  kickoff: string
  homeScore: number | null
  awayScore: number | null
  status: string
}

export function AdminMatchRow({ match }: { match: Match }) {
  const router = useRouter()
  const [homeScore, setHomeScore] = useState(match.homeScore ?? '')
  const [awayScore, setAwayScore] = useState(match.awayScore ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSaveResult() {
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/matches/${match.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore: Number(homeScore), awayScore: Number(awayScore) }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }

    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce match et tous les pronostics associés ?')) return
    setLoading(true)
    await fetch(`/api/pronostics/matches/${match.id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="font-semibold">
          {match.homeTeam} <span className="text-pitch-400">vs</span> {match.awayTeam}
        </div>
        <div className="text-xs text-pitch-400">
          {new Date(match.kickoff).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
          {match.status === 'FINISHED'
            ? 'Terminé'
            : new Date(match.kickoff) <= new Date()
              ? 'Résultat à saisir'
              : 'À venir'}
        </div>
        {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-14 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
        />
        <span className="text-pitch-400">-</span>
        <input
          type="number"
          min={0}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-14 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
        />
        <button
          onClick={handleSaveResult}
          disabled={loading || homeScore === '' || awayScore === ''}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-semibold text-sm px-3 py-1.5 rounded-lg transition"
        >
          Enregistrer
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-300 hover:text-red-200 text-sm px-2 py-1.5"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
