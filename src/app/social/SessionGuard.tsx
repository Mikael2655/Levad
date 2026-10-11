'use client'

import { useEffect } from 'react'
import { IDLE_TIMEOUT_MS } from '@/lib/auth-constants'

const PING_EVERY_MS = 5 * 60 * 1000

// Déconnecte après 1 h sans activité, garde la session ouverte tant qu'on utilise la page,
// et renvoie vers la connexion si le serveur répond « non connecté ».
export default function SessionGuard() {
  useEffect(() => {
    let lastActivity = Date.now()
    let lastPing = Date.now()
    const originalFetch = window.fetch

    const goToLogin = () => {
      window.fetch = originalFetch
      originalFetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/login?expired=1'
      })
    }

    const onActivity = () => { lastActivity = Date.now() }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))

    const check = () => {
      const now = Date.now()
      if (now - lastActivity > IDLE_TIMEOUT_MS) {
        goToLogin()
      } else if (now - lastPing > PING_EVERY_MS && now - lastActivity < PING_EVERY_MS) {
        lastPing = now
        originalFetch('/api/auth/ping', { method: 'POST' }).then(r => { if (r.status === 401) goToLogin() }).catch(() => {})
      }
    }
    const timer = setInterval(check, 15_000)
    document.addEventListener('visibilitychange', check)

    window.fetch = async (...args) => {
      const res = await originalFetch(...args)
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0])
      if (res.status === 401 && url.includes('/api/social')) goToLogin()
      return res
    }

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      events.forEach(e => window.removeEventListener(e, onActivity))
      window.fetch = originalFetch
    }
  }, [])

  return null
}
