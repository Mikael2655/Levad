'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Player {
  id: number
  name: string
  email: string
  role: string
}

export function AdminPlayerRow({ player, isSelf }: { player: Player; isSelf: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggleRole() {
    setError(null)
    setLoading(true)
    const newRole = player.role === 'ADMIN' ? 'PLAYER' : 'ADMIN'

    const res = await fetch(`/api/pronostics/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
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
    if (!confirm(`Supprimer le joueur ${player.name} ?`)) return
    setLoading(true)
    const res = await fetch(`/api/pronostics/players/${player.id}`, { method: 'DELETE' })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }

    router.refresh()
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="font-semibold">
          {player.name} {isSelf && <span className="text-xs text-pitch-400">(toi)</span>}
        </div>
        <div className="text-xs text-pitch-400">{player.email}</div>
        {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg ${
            player.role === 'ADMIN' ? 'bg-gold-500 text-pitch-950' : 'bg-pitch-800 text-pitch-200'
          }`}
        >
          {player.role === 'ADMIN' ? 'Admin' : 'Joueur'}
        </span>
        <button
          onClick={handleToggleRole}
          disabled={loading || (isSelf && player.role === 'ADMIN')}
          className="text-sm text-pitch-200 hover:text-white disabled:opacity-40 underline"
        >
          {player.role === 'ADMIN' ? 'Retirer admin' : 'Rendre admin'}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading || isSelf}
          className="text-sm text-red-300 hover:text-red-200 disabled:opacity-40"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
