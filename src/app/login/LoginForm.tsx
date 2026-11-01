'use client'

import { useState } from 'react'

export default function LoginForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/social'
        return
      }
      setError(data.error ?? 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/5 shadow-card p-8 w-full max-w-sm space-y-5 animate-fade-up overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-leasing-400 via-leasing-500 to-accent-500"></div>
      <div className="text-center pt-2">
        <img src="/levad-social-logo.png" alt="Levad Social" width={146} height={64} className="mx-auto h-16 w-auto" />
        <p className="text-sm text-stone-500 mt-4">Bienvenue, connectez-vous pour gérer vos publications.</p>
      </div>
      {expired && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
          Session expirée après 1 h d&apos;inactivité. Reconnectez-vous.
        </p>
      )}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1">Identifiant</label>
        <input id="username" name="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
          autoFocus autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required
          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-leasing-600 focus:ring-2 focus:ring-leasing-500/30" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Mot de passe</label>
        <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="current-password" required
          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-leasing-600 focus:ring-2 focus:ring-leasing-500/30" />
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={loading || !username || !password}
        className="w-full bg-leasing-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-leasing-800 transition shadow-sm disabled:opacity-50">
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}
