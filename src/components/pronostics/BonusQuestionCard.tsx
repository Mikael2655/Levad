'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BonusQuestion {
  id: number
  question: string
  type: string
  options: string | null
  points: number
  deadline: string | null
  correctAnswer: string | null
}

interface BonusAnswer {
  bonusQuestionId: number
  answer: string
  points: number | null
}

export function BonusQuestionCard({
  competitionId,
  question,
  answer,
}: {
  competitionId: number
  question: BonusQuestion
  answer?: BonusAnswer
}) {
  const router = useRouter()
  const [value, setValue] = useState(answer?.answer ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const options: string[] = question.options ? JSON.parse(question.options) : []
  const isLocked = Boolean(question.correctAnswer) || (question.deadline ? new Date(question.deadline) <= new Date() : false)

  async function handleSave() {
    setError(null)
    setSaved(false)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/bonus-answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bonusQuestionId: question.id, answer: value }),
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
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="font-semibold">{question.question}</div>
        <span className="text-xs shrink-0 bg-pitch-800 text-gold-400 font-bold px-2 py-1 rounded-lg">
          {question.points} pts
        </span>
      </div>

      {error && <p className="text-xs text-red-300 mb-2">{error}</p>}

      {isLocked ? (
        <div className="text-sm text-pitch-300">
          Ta réponse : <span className="font-semibold">{answer?.answer ?? '—'}</span>
          {question.correctAnswer && (
            <span className="ml-2 text-pitch-400">(bonne réponse : {question.correctAnswer})</span>
          )}
          {answer?.points !== undefined && answer?.points !== null && (
            <span className="ml-2 font-bold text-gold-400">+{answer.points} pts</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          {question.type === 'CHOICE' ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
            >
              <option value="">Choisis une réponse</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ta réponse"
              className="flex-1 rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
            />
          )}
          <button
            onClick={handleSave}
            disabled={loading || !value}
            className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-semibold text-sm px-3 py-2 rounded-lg transition"
          >
            {saved ? 'Enregistré ✓' : loading ? '...' : 'Valider'}
          </button>
        </div>
      )}
    </div>
  )
}
