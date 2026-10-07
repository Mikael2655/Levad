'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const expired = params.get('expired') === '1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const next = params.get('next')
        window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/social'
        return
      }
      setError(data.error ?? 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-brand-800 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-lg">L</span>
        </div>
        <div>
          <p className="font-bold text-gray-900">Levad</p>
          <p className="text-xs text-gray-400">Réseaux sociaux</p>
        </div>
      </div>
      {expired && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
          Session expirée après 1 h d&apos;inactivité. Reconnectez-vous.
        </p>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          autoFocus autoComplete="current-password" required
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading || !password}
        className="w-full bg-brand-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50">
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
