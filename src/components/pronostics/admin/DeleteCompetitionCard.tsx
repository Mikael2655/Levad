'use client'

import { useState } from 'react'

export function DeleteCompetitionCard({
  competitionId,
  competitionName,
}: {
  competitionId: number
  competitionName: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canDelete = confirmName.trim() === competitionName.trim() && password.length > 0

  function reset() {
    setConfirming(false)
    setConfirmName('')
    setPassword('')
    setError(null)
  }

  async function handleDelete() {
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/settings`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la suppression.')
      setLoading(false)
      return
    }

    window.location.href = '/pronostics'
  }

  if (!confirming) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-red-700">Zone dangereuse</h3>
        <p className="text-xs text-red-700/80">
          Supprime définitivement cette compétition : joueurs, pronostics, matchs, questions bonus... tout est effacé,
          sans retour possible.
        </p>
        <button
          onClick={() => setConfirming(true)}
          className="text-sm font-semibold text-red-700 border border-red-300 hover:bg-red-100 px-4 py-2 rounded-lg transition"
        >
          Supprimer cette compétition
        </button>
      </div>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-red-700">Confirmer la suppression</h3>
      <p className="text-xs text-red-700/80">
        Cette action est irréversible. Tape le nom exact de la compétition (<strong>{competitionName}</strong>) et ton
        mot de passe pour confirmer.
      </p>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-2">
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder="Nom exact de la compétition"
          className="w-full rounded-lg bg-white border border-red-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ton mot de passe"
          className="w-full rounded-lg bg-white border border-red-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleDelete}
          disabled={!canDelete || loading}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg transition"
        >
          {loading ? 'Suppression...' : 'Supprimer définitivement'}
        </button>
        <button onClick={reset} className="text-sm text-pitch-400 hover:underline">
          Annuler
        </button>
      </div>
    </div>
  )
}
