'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminJoinCodeCard({ competitionId, joinCode }: { competitionId: number; joinCode: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRegenerate() {
    if (!confirm("Régénérer le code d'accès ? L'ancien code ne fonctionnera plus.")) return
    setLoading(true)
    await fetch(`/api/pronostics/competitions/${competitionId}/join-code`, { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-pitch-900 border border-gold-500/40 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="text-xs text-pitch-400 uppercase tracking-wide">Code d'accès à donner aux joueurs</div>
        <div className="text-2xl font-black tracking-widest text-gold-400">{joinCode}</div>
      </div>
      <button
        onClick={handleRegenerate}
        disabled={loading}
        className="bg-pitch-800 hover:bg-pitch-700 disabled:opacity-50 text-sm font-semibold px-3 py-2 rounded-lg transition"
      >
        {loading ? '...' : 'Régénérer'}
      </button>
    </div>
  )
}
