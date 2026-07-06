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

interface Prediction {
  matchId: number
  homeScore: number
  awayScore: number
  points: number | null
}

export function MatchPredictionCard({ match, prediction }: { match: Match; prediction?: Prediction }) {
  const router = useRouter()
  const [homeScore, setHomeScore] = useState(prediction?.homeScore ?? '')
  const [awayScore, setAwayScore] = useState(prediction?.awayScore ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const isLocked = match.status === 'FINISHED' || new Date(match.kickoff) <= new Date()

  async function handleSave() {
    setError(null)
    setSaved(false)
    setLoading(true)

    const res = await fetch('/api/pronostics/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, homeScore: Number(homeScore), awayScore: Number(awayScore) }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la sauvegarde.')
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div>
        <div className="font-semibold">
          {match.homeTeam} <span className="text-pitch-400">vs</span> {match.awayTeam}
        </div>
        <div className="text-xs text-pitch-400">
          {new Date(match.kickoff).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
        {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        {match.status === 'FINISHED' && (
          <span className="text-sm font-bold bg-pitch-800 px-2 py-1 rounded-lg">
            {match.homeScore} - {match.awayScore}
          </span>
        )}

        {isLocked ? (
          <span className="text-sm text-pitch-300">
            Ton pronostic : {prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : '—'}
            {prediction?.points !== undefined && prediction?.points !== null && (
              <span className="ml-2 font-bold text-gold-400">+{prediction.points} pts</span>
            )}
          </span>
        ) : (
          <>
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
              onClick={handleSave}
              disabled={loading || homeScore === '' || awayScore === ''}
              className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-semibold text-sm px-3 py-1.5 rounded-lg transition"
            >
              {saved ? 'Enregistré ✓' : loading ? '...' : 'Valider'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
