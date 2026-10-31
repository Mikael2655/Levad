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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 w-full max-w-sm space-y-5">
      <div className="flex items-center gap-3 pb-1">
        <div className="w-9 h-9 bg-brand-800 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-base">L</span>
        </div>
        <div>
          <p className="font-semibold text-slate-900 leading-tight">Levad</p>
          <p className="text-xs text-slate-500">Réseaux sociaux</p>
        </div>
      </div>
      {expired && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2">
          Session expirée après 1 h d&apos;inactivité. Reconnectez-vous.
        </p>
      )}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Identifiant</label>
        <input id="username" name="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
          autoFocus autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required
          className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
        <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="current-password" required
          className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" />
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={loading || !username || !password}
        className="w-full bg-brand-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-brand-900 transition disabled:opacity-50">
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}
