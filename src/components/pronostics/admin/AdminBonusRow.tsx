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

function parseCorrect(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    // ancienne valeur simple
  }
  return [raw]
}

export function AdminBonusRow({ competitionId, question }: { competitionId: number; question: BonusQuestion }) {
  const router = useRouter()
  const options: string[] = question.options ? JSON.parse(question.options) : []
  const initial = parseCorrect(question.correctAnswer)

  const [selected, setSelected] = useState<string[]>(initial)
  const [textAnswers, setTextAnswers] = useState(initial.join('\n'))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleOption(opt: string) {
    setSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]))
  }

  async function handleSave() {
    setError(null)
    setSaved(false)
    setLoading(true)

    const correctAnswers =
      question.type === 'CHOICE'
        ? selected
        : textAnswers.split('\n').map((a) => a.trim()).filter(Boolean)

    const res = await fetch(`/api/pronostics/${competitionId}/bonus-questions/${question.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctAnswers }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }

    setSaved(true)
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

      <div className="space-y-2">
        <div className="text-xs font-medium text-pitch-300">
          Bonne(s) réponse(s) — tu peux en cocher plusieurs
        </div>

        {question.type === 'CHOICE' ? (
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                  selected.includes(opt)
                    ? 'bg-gold-500 text-white border-gold-500'
                    : 'bg-pitch-950 border-pitch-700 text-pitch-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="hidden"
                />
                {opt}
              </label>
            ))}
          </div>
        ) : (
          <textarea
            value={textAnswers}
            onChange={(e) => setTextAnswers(e.target.value)}
            rows={3}
            placeholder={'Une bonne réponse par ligne\n(ex. Mbappé\nKylian Mbappé)'}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-sm"
          />
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white font-semibold text-sm px-3 py-2 rounded-lg transition"
        >
          {saved ? 'Enregistré ✓' : loading ? '...' : 'Valider les bonnes réponses'}
        </button>
      </div>
    </div>
  )
}
