'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminPhaseForm({ competitionId }: { competitionId: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [order, setOrder] = useState(0)
  const [pointsExactScore, setPointsExactScore] = useState(5)
  const [pointsGoalDifference, setPointsGoalDifference] = useState(3)
  const [pointsCorrectOutcome, setPointsCorrectOutcome] = useState(1)
  const [allowsExtraTime, setAllowsExtraTime] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        order,
        pointsExactScore,
        pointsGoalDifference,
        pointsCorrectOutcome,
        allowsExtraTime,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la création.')
      return
    }

    setName('')
    setOrder((o) => o + 1)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-pitch-900 border border-pitch-800 rounded-xl p-6 space-y-4">
      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Nom de la phase</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Poules, 1/8 de finale, Finale..."
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Ordre d'affichage</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Score exact</label>
          <input
            type="number"
            min={0}
            value={pointsExactScore}
            onChange={(e) => setPointsExactScore(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Bon écart de buts</label>
          <input
            type="number"
            min={0}
            value={pointsGoalDifference}
            onChange={(e) => setPointsGoalDifference(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Bonne tendance</label>
          <input
            type="number"
            min={0}
            value={pointsCorrectOutcome}
            onChange={(e) => setPointsCorrectOutcome(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-pitch-200">
        <input
          type="checkbox"
          checked={allowsExtraTime}
          onChange={(e) => setAllowsExtraTime(e.target.checked)}
          className="rounded border-pitch-700"
        />
        Cette phase peut aller en prolongation (score retenu = 120 min si joué)
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-bold px-4 py-2 rounded-lg transition"
      >
        {loading ? '...' : 'Créer la phase'}
      </button>
    </form>
  )
}
