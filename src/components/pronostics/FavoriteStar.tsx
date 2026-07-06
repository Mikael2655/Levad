'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function FavoriteStar({
  competitionId,
  playerId,
  initialIsFavorite,
}: {
  competitionId: number
  playerId: number
  initialIsFavorite: boolean
}) {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    if (isFavorite) {
      await fetch(`/api/pronostics/${competitionId}/favorites/${playerId}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/pronostics/${competitionId}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoritePlayerId: playerId }),
      })
    }
    setIsFavorite(!isFavorite)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`text-lg leading-none transition ${isFavorite ? 'text-gold-400' : 'text-pitch-600 hover:text-pitch-400'}`}
    >
      {isFavorite ? '★' : '☆'}
    </button>
  )
}
