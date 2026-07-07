'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 20_000

/**
 * Composant invisible : tant que la page est ouverte, déclenche
 * périodiquement une synchronisation (throttlée côté serveur) et rafraîchit
 * les données affichées si de nouveaux résultats sont arrivés.
 */
export function LiveSyncPoller({ competitionId }: { competitionId: number }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/api/pronostics/${competitionId}/sync`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (data.synced) {
          router.refresh()
        }
      } catch {
        // silencieux : une synchro ratée n'est pas bloquante pour l'utilisateur
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS)
    poll()

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [competitionId, router])

  return null
}
