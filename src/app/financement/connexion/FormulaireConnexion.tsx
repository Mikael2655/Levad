'use client'

import { useState } from 'react'

export default function FormulaireConnexion({ suite }: { suite?: string }) {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      const res = await fetch('/api/financement/connexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        window.location.href = suite && suite.startsWith('/financement') && !suite.startsWith('//') ? suite : '/financement'
        return
      }
      setErreur(data.error ?? 'Erreur de connexion')
    } finally {
      setEnvoi(false)
    }
  }

  const champ = 'w-full border border-gray-200 bg-gray-50/60 rounded-xl px-4 py-3 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400 focus:border-leasing-400 transition'
  return (
    <form onSubmit={soumettre} className="bg-white rounded-3xl ring-1 ring-gray-900/5 shadow-xl shadow-leasing-900/5 p-8 sm:p-10 w-full max-w-md space-y-5">
      <div className="text-center space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/levad-logo.png" alt="LEVAD" className="h-12 w-auto mx-auto" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bienvenue sur Leasing</h1>
          <p className="text-sm text-gray-500 mt-1">Connectez-vous pour gérer vos demandes de financement et vos contrats.</p>
        </div>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Adresse e-mail</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus autoComplete="username" required placeholder="prenom.nom@levad.fr" className={champ} />
      </div>
      <div>
        <label htmlFor="mdp" className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
        <input id="mdp" type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} autoComplete="current-password" required placeholder="••••••••" className={champ} />
      </div>
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{erreur}</p>}
      <button type="submit" disabled={envoi}
        className="w-full bg-leasing-700 hover:bg-leasing-800 text-white rounded-xl py-3 text-sm font-semibold shadow-sm shadow-leasing-900/20 transition disabled:opacity-60">
        {envoi ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="text-center text-xs text-gray-400">Mot de passe oublié ? Contactez votre administrateur.</p>
    </form>
  )
}
