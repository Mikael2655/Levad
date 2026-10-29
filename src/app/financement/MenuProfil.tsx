'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// Menu « profil » en haut à droite : identité de la personne connectée, changement de mot de passe, déconnexion.
export default function MenuProfil(p: { prenom: string; nom: string; email: string; role: string }) {
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ouvert) return
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', fermer)
    document.addEventListener('keydown', fermer)
    return () => { document.removeEventListener('mousedown', fermer); document.removeEventListener('keydown', fermer) }
  }, [ouvert])

  const element = 'block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-leasing-50'
  return (
    <div ref={ref} className="relative ml-auto order-2 md:order-none">
      <button className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        <span className="w-8 h-8 rounded-full bg-leasing-100 text-leasing-800 text-xs font-bold ring-1 ring-leasing-200 flex items-center justify-center">{(p.prenom[0] ?? '') + (p.nom[0] ?? '')}</span>
        <span>{p.prenom} {p.nom}</span>
        <span aria-hidden className="text-xs text-gray-400">▾</span>
      </button>
      {ouvert && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-xl z-40 py-1.5 text-sm">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="font-medium text-gray-900">{p.prenom} {p.nom}</p>
            <p className="text-gray-500 text-xs">{p.role}</p>
            <p className="text-gray-500 text-xs break-all">{p.email}</p>
          </div>
          <Link href="/financement/mot-de-passe" className={element} onClick={() => setOuvert(false)}>Changer mon mot de passe</Link>
          <button
            className={element}
            onClick={async () => {
              await fetch('/api/financement/deconnexion', { method: 'POST' })
              window.location.href = '/financement/connexion'
            }}
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}
