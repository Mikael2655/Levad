'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RegisterForm({ competitionId }: { competitionId: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, joinCode }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue.')
      return
    }

    router.push(`/pronostics/${competitionId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-pitch-200 mb-1">Code d'accès</label>
        <input
          required
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Donné par l'administrateur"
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-pitch-200 mb-1">Nom / pseudo</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-pitch-200 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-pitch-200 mb-1">Mot de passe</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
        <p className="text-xs text-pitch-400 mt-1">6 caractères minimum</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-bold py-2.5 rounded-lg transition"
      >
        {loading ? 'Inscription...' : "S'inscrire"}
      </button>
    </form>
  )
}
