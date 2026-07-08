'use client'

import { useEffect, useRef, useState } from 'react'
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

export function PredictionsForm({
  competitionId,
  matches,
  predictions,
}: {
  competitionId: number
  matches: Match[]
  predictions: Prediction[]
}) {
  if (matches.length === 0) {
    return <p className="text-pitch-400 text-sm">Aucun match à venir pour le moment.</p>
  }

  const predictionByMatch = new Map(predictions.map((p) => [p.matchId, p]))

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <PredictionRow key={match.id} competitionId={competitionId} match={match} initial={predictionByMatch.get(match.id)} />
      ))}
    </div>
  )
}

type ScoreValue = '' | number
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Chaque match gère son propre score et son propre enregistrement automatique
// (débounce 1s) : pas de bouton, pas d'état partagé entre les lignes.
function PredictionRow({
  competitionId,
  match,
  initial,
}: {
  competitionId: number
  match: Match
  initial?: Prediction
}) {
  const [home, setHome] = useState<ScoreValue>(initial?.homeScore ?? '')
  const [away, setAway] = useState<ScoreValue>(initial?.awayScore ?? '')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const awayRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const savedResetRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      clearTimeout(saveTimeoutRef.current)
      clearTimeout(savedResetRef.current)
    }
  }, [])

  async function save(homeScore: number, awayScore: number) {
    setStatus('saving')
    try {
      const res = await fetch(`/api/pronostics/${competitionId}/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, homeScore, awayScore }),
      })
      if (!res.ok) throw new Error()
      setStatus('saved')
      clearTimeout(savedResetRef.current)
      savedResetRef.current = setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2500)
    } catch {
      setStatus('error')
    }
  }

  function handleChange(side: 'home' | 'away', raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const value: ScoreValue = digit === '' ? '' : Number(digit)

    const nextHome = side === 'home' ? value : home
    const nextAway = side === 'away' ? value : away
    if (side === 'home') {
      setHome(value)
      if (digit !== '') awayRef.current?.focus()
    } else {
      setAway(value)
    }

    clearTimeout(saveTimeoutRef.current)

    if (nextHome === '' || nextAway === '') {
      setStatus('idle')
      return
    }

    saveTimeoutRef.current = setTimeout(() => save(nextHome as number, nextAway as number), 1000)
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs text-gold-500 font-semibold">{match.phaseName}</div>
        {status === 'saving' && <span className="text-xs text-pitch-400">Enregistrement...</span>}
        {status === 'saved' && <span className="text-xs text-green-600 font-semibold">✓ Enregistré</span>}
        {status === 'error' && <span className="text-xs text-red-600 font-semibold">Erreur, réessaie</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 justify-end text-right min-w-0">
          <span className="font-semibold truncate">{translateTeamName(match.homeTeam)}</span>
          <TeamCrest src={match.homeCrest} alt={match.homeTeam} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={home}
            onChange={(e) => handleChange('home', e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-12 text-center rounded-lg bg-pitch-950 border border-pitch-700 py-1.5"
          />
          <span className="text-pitch-400">-</span>
          <input
            ref={awayRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={away}
            onChange={(e) => handleChange('away', e.target.value)}
            onFocus={(e) => e.target.select()}
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
  )
}
