'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Phase {
  id: number
  name: string
  order: number
  pointsExactScore: number
  pointsGoalDifference: number
  pointsCorrectOutcome: number
  allowsExtraTime: boolean
}

export function AdminPhaseRow({ competitionId, phase }: { competitionId: number; phase: Phase }) {
  const router = useRouter()
  const [pointsExactScore, setPointsExactScore] = useState(phase.pointsExactScore)
  const [pointsGoalDifference, setPointsGoalDifference] = useState(phase.pointsGoalDifference)
  const [pointsCorrectOutcome, setPointsCorrectOutcome] = useState(phase.pointsCorrectOutcome)
  const [allowsExtraTime, setAllowsExtraTime] = useState(phase.allowsExtraTime)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    await fetch(`/api/pronostics/${competitionId}/phases/${phase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pointsExactScore, pointsGoalDifference, pointsCorrectOutcome, allowsExtraTime }),
    })
    setLoading(false)
    setSaved(true)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la phase "${phase.name}" et tous ses matchs ?`)) return
    setLoading(true)
    await fetch(`/api/pronostics/${competitionId}/phases/${phase.id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{phase.name}</div>
        <button onClick={handleDelete} disabled={loading} className="text-red-300 hover:text-red-200 text-sm">
          Supprimer
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-pitch-400 mb-1">Score exact</label>
          <input
            type="number"
            min={0}
            value={pointsExactScore}
            onChange={(e) => setPointsExactScore(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-pitch-400 mb-1">Écart de buts</label>
          <input
            type="number"
            min={0}
            value={pointsGoalDifference}
            onChange={(e) => setPointsGoalDifference(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-pitch-400 mb-1">Tendance</label>
          <input
            type="number"
            min={0}
            value={pointsCorrectOutcome}
            onChange={(e) => setPointsCorrectOutcome(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-1.5"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-pitch-200">
          <input
            type="checkbox"
            checked={allowsExtraTime}
            onChange={(e) => setAllowsExtraTime(e.target.checked)}
            className="rounded border-pitch-700"
          />
          Prolongation possible (120 min)
        </label>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-semibold text-sm px-3 py-1.5 rounded-lg transition"
        >
          {saved ? 'Enregistré ✓' : loading ? '...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
