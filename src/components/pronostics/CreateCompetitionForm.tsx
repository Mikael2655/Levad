'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateCompetitionForm() {
  const router = useRouter()
  const [competitionName, setCompetitionName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/pronostics/competitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitionName, adminName, adminEmail, adminPassword }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue.')
      return
    }

    router.push(`/pronostics/${data.id}/admin`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-pitch-200 mb-1">Nom de la compétition</label>
        <input
          required
          value={competitionName}
          onChange={(e) => setCompetitionName(e.target.value)}
          placeholder="Coupe du monde 2026"
          className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      <div className="pt-2 border-t border-pitch-800">
        <p className="text-xs text-pitch-400 mb-3">Ton compte administrateur pour cette compétition</p>
        <div className="space-y-3">
          <input
            required
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Nom / pseudo"
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="email"
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <input
            type="password"
            required
            minLength={6}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Mot de passe (6 caractères min.)"
            className="w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-pitch-950 font-bold py-2.5 rounded-lg transition"
      >
        {loading ? 'Création...' : 'Créer la compétition'}
      </button>
    </form>
  )
}
