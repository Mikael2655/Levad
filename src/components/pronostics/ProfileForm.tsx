'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/pronostics/Avatar'

interface Props {
  competitionId: number
  player: { name: string; email: string; avatarUrl: string | null }
}

// Redimensionne une image (fichier) en un carré data URL JPEG léger.
function resizeImage(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas non disponible'))
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('Image illisible'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

export function ProfileForm({ competitionId, player }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(player.name)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(player.avatarUrl)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const resized = await resizeImage(file)
      setAvatarUrl(resized)
    } catch {
      setError("Impossible de traiter l'image.")
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatarUrl }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }
    setMessage('Profil mis à jour.')
    router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const res = await fetch(`/api/pronostics/${competitionId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur.')
      return
    }
    setMessage('Mot de passe modifié.')
    setCurrentPassword('')
    setNewPassword('')
  }

  const inputClass =
    'w-full rounded-lg bg-pitch-950 border border-pitch-700 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500'

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {message && (
        <p className="text-sm text-gold-500 bg-gold-500/10 border border-gold-500/30 rounded-lg px-3 py-2">{message}</p>
      )}

      <form onSubmit={handleSaveProfile} className="bg-pitch-900 border border-pitch-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">Mon profil</h2>

        <div className="flex items-center gap-4">
          <Avatar name={name} avatarUrl={avatarUrl} size={64} />
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-semibold bg-pitch-800 hover:bg-pitch-700 px-3 py-1.5 rounded-lg transition"
            >
              Changer la photo
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="text-xs text-red-700 hover:text-red-800"
              >
                Retirer la photo
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Pseudo</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Email</label>
          <input value={player.email} disabled className={`${inputClass} opacity-60`} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition"
        >
          {loading ? '...' : 'Enregistrer'}
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="bg-pitch-900 border border-pitch-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">Changer mon mot de passe</h2>

        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Mot de passe actuel</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-pitch-200 mb-1">Nouveau mot de passe</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            className={inputClass}
          />
          <p className="text-xs text-pitch-400 mt-1">6 caractères minimum</p>
        </div>

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword}
          className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition"
        >
          {loading ? '...' : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  )
}
