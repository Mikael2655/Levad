'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BonusQuestion {
  id: number
  question: string
  type: string
  options: string | null
  points: number
  correctAnswer: string | null
}

export function AdminBonusRow({ competitionId, question }: { competitionId: number; question: BonusQuestion }) {
  const router = useRouter()
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options: string[] = question.options ? JSON.parse(question.options) : []

  async function handleSetCorrectAnswer() {
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/bonus-questions/${question.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctAnswer }),
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
    if (!confirm('Supprimer cette question bonus ?')) return
    setLoading(true)
    await fetch(`/api/pronostics/${competitionId}/bonus-questions/${question.id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{question.question}</div>
          <div className="text-xs text-pitch-400">
            {question.points} pts · {question.type === 'CHOICE' ? 'Choix multiple' : 'Texte libre'}
          </div>
        </div>
        <button onClick={handleDelete} disabled={loading} className="text-red-700 hover:text-red-800 text-sm shrink-0">
          Supprimer
        </button>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <div className="flex items-center gap-2">
        {question.type === 'CHOICE' ? (
          <select
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="flex-1 rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          >
            <option value="">Bonne réponse...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="Bonne réponse"
            className="flex-1 rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          />
        )}
        <button
          onClick={handleSetCorrectAnswer}
          disabled={loading || !correctAnswer}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-semibold text-sm px-3 py-2 rounded-lg transition"
        >
          Valider la réponse
        </button>
      </div>
    </div>
  )
}
