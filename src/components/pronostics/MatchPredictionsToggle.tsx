'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/pronostics/Avatar'

interface PredictionRow {
  playerId: number
  playerName: string
  avatarUrl: string | null
  homeScore: number
  awayScore: number
  points: number | null
}

// Liste repliée par défaut : avec 300 joueurs et plusieurs matchs en direct,
// tout afficher en permanence rendrait la page illisible.
export function MatchPredictionsToggle({
  competitionId,
  showPoints,
  predictions,
}: {
  competitionId: number
  showPoints: boolean
  predictions: PredictionRow[]
}) {
  const [open, setOpen] = useState(false)

  if (predictions.length === 0) {
    return <p className="text-sm text-pitch-400 p-4">Personne n'a pronostiqué ce match.</p>
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-pitch-300 hover:bg-pitch-800/50 transition"
      >
        <span>
          {predictions.length} pronostic{predictions.length > 1 ? 's' : ''}
        </span>
        <span className="font-semibold">{open ? '▲ Masquer' : '▼ Voir les pronostics'}</span>
      </button>

      {open && (
        <div className="divide-y divide-pitch-800 border-t border-pitch-800">
          {predictions.map((p) => (
            <div key={p.playerId} className="flex items-center justify-between px-4 py-2 text-sm">
              <Link
                href={`/pronostics/${competitionId}/joueur/${p.playerId}`}
                className="flex items-center gap-2 hover:underline min-w-0"
              >
                <Avatar name={p.playerName} avatarUrl={p.avatarUrl} size={24} />
                <span className="truncate">{p.playerName}</span>
              </Link>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-pitch-300 tabular-nums">
                  {p.homeScore} - {p.awayScore}
                </span>
                {showPoints && p.points !== null && <span className="font-bold text-gold-500">+{p.points} pts</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
