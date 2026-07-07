'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const COMMON_CODES = [
  { code: 'WC', label: 'Coupe du monde' },
  { code: 'CL', label: 'Ligue des champions' },
  { code: 'EC', label: 'Euro' },
  { code: 'PL', label: 'Premier League' },
  { code: 'PD', label: 'Liga' },
  { code: 'BL1', label: 'Bundesliga' },
  { code: 'SA', label: 'Serie A' },
  { code: 'FL1', label: 'Ligue 1' },
]

export function AdminSyncCard({
  competitionId,
  externalCode,
  lastSyncedAt,
}: {
  competitionId: number
  externalCode: string | null
  lastSyncedAt: string | null
}) {
  const router = useRouter()
  const [code, setCode] = useState(externalCode ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSaveCode() {
    setError(null)
    setMessage(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalCode: code }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }

    setMessage('Code enregistré.')
    router.refresh()
  }

  async function handleSyncNow() {
    setError(null)
    setMessage(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/sync`, { method: 'POST' })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Erreur de synchronisation.')
      return
    }

    setMessage(
      data.synced
        ? `Synchronisé : ${data.matchCount} match(s) trouvé(s).`
        : "Synchronisation non effectuée (code non configuré)."
    )
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="font-semibold mb-1">Synchronisation automatique (football-data.org)</h3>
        <p className="text-xs text-pitch-400">
          Renseigne le code de la compétition pour importer et mettre à jour automatiquement calendrier, scores en
          direct et résultats.
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-pitch-200">{message}</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ex. WC, CL, PL..."
          className="flex-1 rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 uppercase"
        />
        <button
          onClick={handleSaveCode}
          disabled={loading}
          className="bg-pitch-700 hover:bg-pitch-600 disabled:opacity-50 text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Enregistrer
        </button>
        <button
          onClick={handleSyncNow}
          disabled={loading || !externalCode}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 text-sm font-bold px-4 py-2 rounded-lg transition"
        >
          Synchroniser maintenant
        </button>
      </div>

      <p className="text-xs text-pitch-500">
        Codes courants : {COMMON_CODES.map((c) => `${c.label} (${c.code})`).join(' · ')}
      </p>

      {lastSyncedAt && (
        <p className="text-xs text-pitch-400">
          Dernière synchro :{' '}
          {new Date(lastSyncedAt).toLocaleString('fr-FR', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Europe/Paris',
          })}
        </p>
      )}
    </div>
  )
}
