'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

// Formulaire de filtres sans bouton : chaque choix recharge la liste (la saisie du nom du client, dès la 1re lettre, après une courte pause).
// Le choix « Montant affiché » (name="m") ne recharge rien : il bascule instantanément (voir SelecteurMontant).
export default function FormulaireFiltres({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter()
  const chemin = usePathname()
  const formulaire = useRef<HTMLFormElement>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(minuteur.current), [])

  function appliquer() {
    if (!formulaire.current) return
    const params = new URLSearchParams()
    new FormData(formulaire.current).forEach((v, k) => { if (typeof v === 'string' && v.trim() !== '') params.set(k, v.trim()) })
    const qs = params.toString()
    router.replace(qs ? `${chemin}?${qs}` : chemin, { scroll: false })
  }

  return (
    <form
      ref={formulaire}
      className={className}
      onSubmit={e => { e.preventDefault(); appliquer() }}
      onChange={e => {
        const t = e.target as HTMLInputElement
        if (t.name === 'm') return
        clearTimeout(minuteur.current)
        if (t.type === 'text' || t.type === 'search') minuteur.current = setTimeout(appliquer, 250)
        else appliquer()
      }}
    >
      {children}
    </form>
  )
}
