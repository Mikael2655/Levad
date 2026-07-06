'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: number
  homeTeam: string
  awayTeam: string
  kickoff: string
  status: string
  homeScoreFullTime: number | null
  awayScoreFullTime: number | null
  homeScoreExtraTime: number | null
  awayScoreExtraTime: number | null
  phase: { id: number; name: string; allowsExtraTime: boolean }
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'À venir',
  LIVE: 'En direct',
  FINISHED: 'Terminé',
}

export function AdminMatchRow({ competitionId, match }: { competitionId: number; match: Match }) {
  const router = useRouter()
  const [homeFT, setHomeFT] = useState(match.homeScoreFullTime ?? '')
  const [awayFT, setAwayFT] = useState(match.awayScoreFullTime ?? '')
  const [homeET, setHomeET] = useState(match.homeScoreExtraTime ?? '')
  const [awayET, setAwayET] = useState(match.awayScoreExtraTime ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(body: Record<string, unknown>) {
    setError(null)
    setLoading(true)
    const res = await fetch(`/api/pronostics/${competitionId}/matches/${match.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }
    router.refresh()
  }

  function scorePayload() {
    return {
      homeScoreFullTime: homeFT === '' ? null : Number(homeFT),
      awayScoreFullTime: awayFT === '' ? null : Number(awayFT),
      homeScoreExtraTime: homeET === '' ? null : Number(homeET),
      awayScoreExtraTime: awayET === '' ? null : Number(awayET),
    }
  }

  async function handleSaveScore() {
    await patch(scorePayload())
  }

  async function handleGoLive() {
    await patch({ status: 'LIVE', ...scorePayload() })
  }

  async function handleFinish() {
    await patch({ status: 'FINISHED', ...scorePayload() })
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce match et tous les pronostics associés ?')) return
    setLoading(true)
    await fetch(`/api/pronostics/${competitionId}/matches/${match.id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-gold-400 font-semibold mb-0.5">{match.phase.name}</div>
          <div className="font-semibold">
            {match.homeTeam} <span className="text-pitch-400">vs</span> {match.awayTeam}
          </div>
          <div className="text-xs text-pitch-400">
            {new Date(match.kickoff).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
            {STATUS_LABELS[match.status]}
          </div>
        </div>
        <button onClick={handleDelete} disabled={loading} className="text-red-300 hover:text-red-200 text-sm">
          Supprimer
        </button>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-pitch-400 mb-1">Score (90 min)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={homeFT}
              onChange={(e) => setHomeFT(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-14 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
            />
            <span className="text-pitch-400">-</span>
            <input
              type="number"
              min={0}
              value={awayFT}
              onChange={(e) => setAwayFT(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-14 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
            />
          </div>
        </div>

        {match.phase.allowsExtraTime && (
          <div>
            <label className="block text-xs text-pitch-400 mb-1">Score après prolongation (si joué)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={homeET}
                onChange={(e) => setHomeET(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-14 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
              />
              <span className="text-pitch-400">-</span>
              <input
                type="number"
                min={0}
                value={awayET}
                onChange={(e) => setAwayET(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-14 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSaveScore}
            disabled={loading}
            className="bg-pitch-700 hover:bg-pitch-600 disabled:opacity-50 text-sm font-semibold px-3 py-2 rounded-lg transition"
          >
            Enregistrer le score
          </button>
          {match.status !== 'LIVE' && match.status !== 'FINISHED' && (
            <button
              onClick={handleGoLive}
              disabled={loading}
              className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-sm font-semibold px-3 py-2 rounded-lg transition"
            >
              Marquer en direct
            </button>
          )}
          {match.status !== 'FINISHED' && (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 text-sm font-bold px-3 py-2 rounded-lg transition"
            >
              Clôturer le match
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
