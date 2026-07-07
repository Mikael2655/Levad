'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/pronostics/Avatar'

interface Player {
  id: number
  name: string
  email: string
  role: string
  avatarUrl?: string | null
}

export function AdminPlayerRow({
  competitionId,
  player,
  isSelf,
}: {
  competitionId: number
  player: Player
  isSelf: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(player.name)

  async function patch(body: Record<string, unknown>) {
    setError(null)
    setLoading(true)
    const res = await fetch(`/api/pronostics/${competitionId}/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return false
    }
    router.refresh()
    return true
  }

  async function handleSaveName() {
    if (await patch({ name })) setEditing(false)
  }

  async function handleToggleRole() {
    await patch({ role: player.role === 'ADMIN' ? 'PLAYER' : 'ADMIN' })
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le joueur ${player.name} ?`)) return
    setLoading(true)
    const res = await fetch(`/api/pronostics/${competitionId}/players/${player.id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={player.name} avatarUrl={player.avatarUrl} size={36} />
        <div className="min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg bg-pitch-950 border border-pitch-700 px-2 py-1 text-sm"
              />
              <button onClick={handleSaveName} disabled={loading} className="text-sm text-gold-500 font-semibold">
                OK
              </button>
              <button onClick={() => { setEditing(false); setName(player.name) }} className="text-sm text-pitch-400">
                Annuler
              </button>
            </div>
          ) : (
            <div className="font-semibold flex items-center gap-2">
              <span className="truncate">{player.name}</span>
              {isSelf && <span className="text-xs text-pitch-400">(toi)</span>}
              <button onClick={() => setEditing(true)} className="text-xs text-gold-500 hover:underline">
                Renommer
              </button>
            </div>
          )}
          <div className="text-xs text-pitch-400 truncate">{player.email}</div>
          {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg ${
            player.role === 'ADMIN' ? 'bg-gold-500 text-white' : 'bg-pitch-800 text-pitch-200'
          }`}
        >
          {player.role === 'ADMIN' ? 'Admin' : 'Joueur'}
        </span>
        <button
          onClick={handleToggleRole}
          disabled={loading || (isSelf && player.role === 'ADMIN')}
          className="text-sm text-pitch-200 hover:text-gray-900 disabled:opacity-40 underline"
        >
          {player.role === 'ADMIN' ? 'Retirer admin' : 'Rendre admin'}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading || isSelf}
          className="text-sm text-red-700 hover:text-red-800 disabled:opacity-40"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
