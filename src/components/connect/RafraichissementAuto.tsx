'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Met à jour les données affichées toutes les minutes, sans recharger la page.
// On n'actualise pas quand l'onglet est caché, ni pendant qu'on est en train de remplir un champ
// (pour ne jamais gêner une saisie).

const INTERVALLE_MS = 60_000

export function RafraichissementAuto() {
  const router = useRouter()
  const [derniere, setDerniere] = useState<Date | null>(null)

  useEffect(() => {
    setDerniere(new Date())
    const actualiser = () => {
      if (document.hidden) return
      const actif = document.activeElement
      if (actif && ['INPUT', 'SELECT', 'TEXTAREA'].includes(actif.tagName)) return
      router.refresh()
      setDerniere(new Date())
    }
    const minuteur = setInterval(actualiser, INTERVALLE_MS)
    document.addEventListener('visibilitychange', actualiser) // retour sur l'onglet : mise à jour immédiate
    return () => {
      clearInterval(minuteur)
      document.removeEventListener('visibilitychange', actualiser)
    }
  }, [router])

  if (!derniere) return null
  return (
    <span className="text-xs text-gray-400" title="Les données se mettent à jour toutes seules chaque minute">
      Actualisé à {derniere.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}
