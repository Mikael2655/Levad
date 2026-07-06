'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ScoringRule {
  pointsExactScore: number
  pointsGoalDifference: number
  pointsCorrectOutcome: number
}

export function AdminBaremeForm({ rule }: { rule: ScoringRule }) {
  const router = useRouter()
  const [pointsExactScore, setPointsExactScore] = useState(rule.pointsExactScore)
  const [pointsGoalDifference, setPointsGoalDifference] = useState(rule.pointsGoalDifference)
  const [pointsCorrectOutcome, setPointsCorrectOutcome] = useState(rule.pointsCorrectOutcome)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)

    const res = await fetch('/api/pronostics/scoring-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pointsExactScore, pointsGoalDifference, pointsCorrectOutcome }),
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
    <form onSubmit={handleSubmit} className="bg-pitch-900 border border-pitch-800 rounded-xl p-6 space-y-4 max-w-md">
      {error && <p className="text-sm text-red-300">{error}</p>}

      <Field label="Score exact" value={pointsExactScore} onChange={setPointsExactScore} />
      <Field label="Bon écart de buts" value={pointsGoalDifference} onChange={setPointsGoalDifference} />
      <Field label="Bonne tendance (1N2)" value={pointsCorrectOutcome} onChange={setPointsCorrectOutcome} />

      <button
        type="submit"
        disabled={loading}
        className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-bold px-4 py-2 rounded-lg transition"
      >
        {saved ? 'Enregistré ✓' : loading ? '...' : 'Enregistrer le barème'}
      </button>
      <p className="text-xs text-pitch-400">
        Modifier le barème recalcule automatiquement les points de tous les matchs déjà terminés.
      </p>
    </form>
  )
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-pitch-200 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
      />
    </div>
  )
}
