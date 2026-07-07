'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TeamCrest } from '@/components/pronostics/TeamCrest'
import { translateTeamName } from '@/lib/team-names'
import { formatKickoff } from '@/lib/format-date'

interface Match {
  id: number
  homeTeam: string
  awayTeam: string
  homeCrest: string | null
  awayCrest: string | null
  kickoff: string
  phaseName: string
}

interface Prediction {
  matchId: number
  homeScore: number
  awayScore: number
}

type ScoreValue = number | ''

export function PredictionsForm({
  competitionId,
  matches,
  predictions,
}: {
  competitionId: number
  matches: Match[]
  predictions: Prediction[]
}) {
  const router = useRouter()
  const initial: Record<number, { home: ScoreValue; away: ScoreValue }> = {}
  for (const m of matches) {
    const p = predictions.find((x) => x.matchId === m.id)
    initial[m.id] = { home: p?.homeScore ?? '', away: p?.awayScore ?? '' }
  }

  const [scores, setScores] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function setScore(matchId: number, side: 'home' | 'away', value: string) {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value === '' ? '' : Math.max(0, Number(value)) },
    }))
  }

  async function handleSaveAll() {
    setLoading(true)
    setMessage(null)

    const payload = Object.entries(scores)
      .filter(([, v]) => v.home !== '' && v.away !== '')
      .map(([matchId, v]) => ({ matchId: Number(matchId), homeScore: Number(v.home), awayScore: Number(v.away) }))

    const res = await fetch(`/api/pronostics/${competitionId}/predictions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictions: payload }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setMessage(data.error ?? 'Erreur lors de la sauvegarde.')
      return
    }
    setMessage(`${data.saved} pronostic(s) enregistré(s).`)
    router.refresh()
  }

  if (matches.length === 0) {
    return <p className="text-pitch-400 text-sm">Aucun match à venir pour le moment.</p>
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-[68px] z-10 flex items-center justify-between gap-3 bg-pitch-950/95 backdrop-blur py-2">
        <button
          onClick={handleSaveAll}
          disabled={loading}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg transition"
        >
          {loading ? 'Enregistrement...' : 'Tout enregistrer'}
        </button>
        {message && <span className="text-sm text-pitch-300">{message}</span>}
      </div>

      {matches.map((match) => (
        <div key={match.id} className="bg-pitch-900 border border-pitch-800 rounded-xl p-4">
          <div className="text-xs text-gold-500 font-semibold mb-2">{match.phaseName}</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 justify-end text-right min-w-0">
              <span className="font-semibold truncate">{translateTeamName(match.homeTeam)}</span>
              <TeamCrest src={match.homeCrest} alt={match.homeTeam} />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={scores[match.id].home}
                onChange={(e) => setScore(match.id, 'home', e.target.value)}
                className="w-12 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
              />
              <span className="text-pitch-400">-</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={scores[match.id].away}
                onChange={(e) => setScore(match.id, 'away', e.target.value)}
                className="w-12 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
              />
            </div>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <TeamCrest src={match.awayCrest} alt={match.awayTeam} />
              <span className="font-semibold truncate">{translateTeamName(match.awayTeam)}</span>
            </div>
          </div>
          <div className="text-xs text-pitch-400 text-center mt-2">{formatKickoff(match.kickoff)}</div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSaveAll}
          disabled={loading}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg transition"
        >
          {loading ? 'Enregistrement...' : 'Tout enregistrer'}
        </button>
        {message && <span className="text-sm text-pitch-300">{message}</span>}
      </div>
    </div>
  )
}
