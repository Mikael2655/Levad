'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminBonusForm({ competitionId }: { competitionId: number }) {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [type, setType] = useState<'TEXT' | 'CHOICE'>('TEXT')
  const [optionsText, setOptionsText] = useState('')
  const [points, setPoints] = useState(3)
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const options = type === 'CHOICE' ? optionsText.split('\n').map((o) => o.trim()).filter(Boolean) : undefined

    const res = await fetch(`/api/pronostics/${competitionId}/bonus-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, type, options, points, deadline: deadline || undefined }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la création.')
      return
    }

    setQuestion('')
    setOptionsText('')
    setPoints(3)
    setDeadline('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-pitch-900 border border-pitch-800 rounded-xl p-6 space-y-4">
      {error && <p className="text-sm text-red-300">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-pitch-200 mb-1">Question</label>
        <input
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          placeholder="Qui sera le meilleur buteur du tournoi ?"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Type de réponse</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'TEXT' | 'CHOICE')}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          >
            <option value="TEXT">Texte libre</option>
            <option value="CHOICE">Choix multiple</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Points</label>
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
          />
        </div>
      </div>

      {type === 'CHOICE' && (
        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Options (une par ligne)</label>
          <textarea
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
            placeholder={'France\nBrésil\nAllemagne'}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-pitch-200 mb-1">Date limite (optionnel)</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full sm:w-64 rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-bold px-4 py-2 rounded-lg transition"
      >
        {loading ? '...' : 'Créer la question bonus'}
      </button>
    </form>
  )
}
