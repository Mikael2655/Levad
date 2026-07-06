'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Phase {
  id: number
  name: string
}

interface Candidate {
  homeTeam: string
  awayTeam: string
  kickoff: string | null
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminMatchImport({ competitionId, phases }: { competitionId: number; phases: Phase[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<'wikipedia' | 'paste'>('wikipedia')
  const [pageTitle, setPageTitle] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [phaseId, setPhaseId] = useState<number | ''>(phases[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handlePreview() {
    setError(null)
    setResult(null)
    setLoading(true)

    const endpoint = mode === 'wikipedia' ? 'parse-wikipedia' : 'parse-paste'
    const body = mode === 'wikipedia' ? { pageTitle } : { text: pastedText }

    const res = await fetch(`/api/pronostics/${competitionId}/matches/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Échec de l'import.")
      setCandidates(null)
      return
    }

    setCandidates(data.candidates)
  }

  function updateCandidate(index: number, patch: Partial<Candidate>) {
    setCandidates((prev) => prev!.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => prev!.filter((_, i) => i !== index))
  }

  async function handleConfirm() {
    if (!candidates || !phaseId) return
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/matches/bulk-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phaseId: Number(phaseId),
        matches: candidates.map((c) => ({
          homeTeam: c.homeTeam,
          awayTeam: c.awayTeam,
          kickoff: c.kickoff ? new Date(c.kickoff).toISOString() : null,
        })),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Échec de l'import.")
      return
    }

    setResult(`${data.created} match(s) importé(s)${data.skipped ? `, ${data.skipped} ignoré(s) (date manquante)` : ''}.`)
    setCandidates(null)
    setPastedText('')
    setPageTitle('')
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Importer un calendrier</h3>
        <div className="flex gap-1">
          <button
            onClick={() => { setMode('wikipedia'); setCandidates(null); setError(null) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${mode === 'wikipedia' ? 'bg-pitch-700' : 'bg-pitch-950 text-pitch-300'}`}
          >
            Depuis Wikipédia
          </button>
          <button
            onClick={() => { setMode('paste'); setCandidates(null); setError(null) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${mode === 'paste' ? 'bg-pitch-700' : 'bg-pitch-950 text-pitch-300'}`}
          >
            Coller une liste
          </button>
        </div>
      </div>

      {mode === 'wikipedia' ? (
        <div>
          <label className="block text-xs text-pitch-400 mb-1">Titre de la page Wikipédia (en anglais, ex. "2026 FIFA World Cup")</label>
          <div className="flex gap-2">
            <input
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="2026 FIFA World Cup"
              className="flex-1 rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2"
            />
            <button
              onClick={handlePreview}
              disabled={loading || !pageTitle}
              className="bg-pitch-700 hover:bg-pitch-600 disabled:opacity-50 text-sm font-semibold px-4 py-2 rounded-lg transition shrink-0"
            >
              {loading ? '...' : 'Aperçu'}
            </button>
          </div>
          <p className="text-xs text-pitch-500 mt-2">
            Import best-effort : vérifie et corrige la liste ci-dessous avant de valider. Si ça ne fonctionne pas, utilise
            "Coller une liste".
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-xs text-pitch-400 mb-1">Une ligne par match : Équipe A;Équipe B;2026-06-12 20:00</label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={5}
            placeholder={'France;Brésil;2026-06-12 20:00\nEspagne;Italie;2026-06-13 17:00'}
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 font-mono text-sm"
          />
          <button
            onClick={handlePreview}
            disabled={loading || !pastedText}
            className="mt-2 bg-pitch-700 hover:bg-pitch-600 disabled:opacity-50 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {loading ? '...' : 'Aperçu'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
      {result && <p className="text-sm text-pitch-200">{result}</p>}

      {candidates && candidates.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-pitch-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-pitch-300">{candidates.length} match(s) trouvé(s) — vérifie avant d'importer :</p>
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-1.5 text-sm"
            >
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {candidates.map((c, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-pitch-950 rounded-lg p-2">
                <input
                  value={c.homeTeam}
                  onChange={(e) => updateCandidate(i, { homeTeam: e.target.value })}
                  className="flex-1 rounded bg-pitch-900 border border-pitch-700 px-2 py-1 text-sm"
                />
                <input
                  value={c.awayTeam}
                  onChange={(e) => updateCandidate(i, { awayTeam: e.target.value })}
                  className="flex-1 rounded bg-pitch-900 border border-pitch-700 px-2 py-1 text-sm"
                />
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(c.kickoff)}
                  onChange={(e) => updateCandidate(i, { kickoff: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="rounded bg-pitch-900 border border-pitch-700 px-2 py-1 text-sm"
                />
                <button onClick={() => removeCandidate(i)} className="text-red-300 hover:text-red-200 text-xs shrink-0">
                  Retirer
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading || !phaseId}
            className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-bold px-4 py-2 rounded-lg transition"
          >
            {loading ? '...' : `Importer ${candidates.length} match(s)`}
          </button>
        </div>
      )}
    </div>
  )
}
