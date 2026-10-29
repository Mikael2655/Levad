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

  return (
    <form onSubmit={soumettre} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-brand-800 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-lg">L</span>
        </div>
        <div>
          <p className="font-bold text-gray-900">Levad</p>
          <p className="text-xs text-gray-400">Financements</p>
        </div>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus autoComplete="username" required
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
      </div>
      <div>
        <label htmlFor="mdp" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <input id="mdp" type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} autoComplete="current-password" required
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
      </div>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <button type="submit" disabled={envoi}
        className="w-full bg-brand-800 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
        {envoi ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
