'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SocialPost {
  id: number
  topic: string
  contentLI: string | null
  contentIG: string | null
  imagePrompt: string | null
  status: string
  scheduledAt: string | null
  publishedAt: string | null
  linkedinPostId: string | null
  instagramPostId: string | null
  errorMessage: string | null
  createdAt: string
}

interface Config {
  companyName: string
  companyDesc: string
  tone: string
  targetAudience: string
  topics: string
  scheduleDays: string
  scheduleHour: number
  linkedinEnabled: boolean
  instagramEnabled: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Planifié', color: 'bg-blue-100 text-blue-700' },
  publishing: { label: 'Publication...', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Publié', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Échec', color: 'bg-red-100 text-red-700' },
}

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [tab, setTab] = useState<'posts' | 'config'>('posts')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  async function loadPosts() {
    const res = await fetch('/api/social/posts')
    const data = await res.json()
    setPosts(data.posts ?? [])
  }

  async function loadConfig() {
    const res = await fetch('/api/social/config')
    const data = await res.json()
    setConfig(data.config)
  }

  useEffect(() => {
    loadPosts()
    loadConfig()
  }, [])

  async function handleGenerate() {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (data.post) {
        setTopic('')
        await loadPosts()
        setEditingPost(data.post)
      } else {
        alert('Erreur: ' + (data.error ?? 'Génération échouée'))
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish(postId: number) {
    setPublishing(postId)
    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      await loadPosts()
      if (!data.success) {
        alert('Erreurs: ' + data.errors.join('\n'))
      }
    } finally {
      setPublishing(null)
    }
  }

  async function handleSavePost() {
    if (!editingPost) return
    setLoading(true)
    try {
      await fetch('/api/social/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPost.id,
          contentLI: editingPost.contentLI,
          contentIG: editingPost.contentIG,
        }),
      })
      await loadPosts()
      setEditingPost(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce post ?')) return
    await fetch(`/api/social/posts?id=${id}`, { method: 'DELETE' })
    await loadPosts()
    if (editingPost?.id === id) setEditingPost(null)
  }

  async function handleSaveConfig() {
    if (!config) return
    setSavingConfig(true)
    try {
      await fetch('/api/social/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
    failed: posts.filter(p => p.status === 'failed').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-800 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-brand-800 font-black">L</span>
              </div>
              <span className="font-bold text-lg">Levad</span>
            </Link>
            <span className="text-blue-300">/ Réseaux Sociaux</span>
          </div>
          <Link href="/" className="text-sm text-blue-200 hover:text-white transition">← Retour au site</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Posts créés', value: stats.total, color: 'bg-white border-gray-200' },
            { label: 'Publiés', value: stats.published, color: 'bg-green-50 border-green-200' },
            { label: 'Brouillons', value: stats.draft, color: 'bg-blue-50 border-blue-200' },
            { label: 'Échecs', value: stats.failed, color: 'bg-red-50 border-red-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-5 ${s.color}`}>
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(['posts', 'config'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                tab === t
                  ? 'border-brand-800 text-brand-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'posts' ? 'Publications' : 'Configuration'}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Generate + List */}
            <div className="lg:col-span-1 space-y-4">
              {/* Generate */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Générer un post IA</h2>
                <div className="space-y-3">
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    placeholder="Ex: les avantages de la GED..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !topic.trim()}
                    className="w-full bg-brand-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? 'Génération en cours...' : 'Générer avec Claude AI'}
                  </button>
                </div>
                {config && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Sujets configurés :</p>
                    <div className="flex flex-wrap gap-1">
                      {config.topics.split(',').map(t => (
                        <button
                          key={t}
                          onClick={() => setTopic(t.trim())}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200 transition"
                        >
                          {t.trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Post list */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm">{posts.length} post{posts.length > 1 ? 's' : ''}</h2>
                </div>
                {posts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <p className="text-3xl mb-2">✍️</p>
                    <p>Aucun post encore</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                    {posts.map(post => {
                      const s = STATUS_LABELS[post.status] ?? { label: post.status, color: 'bg-gray-100 text-gray-600' }
                      return (
                        <div
                          key={post.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition ${editingPost?.id === post.id ? 'bg-blue-50' : ''}`}
                          onClick={() => setEditingPost(post)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{post.topic}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${s.color}`}>{s.label}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                            {post.linkedinPostId && ' · LinkedIn ✓'}
                            {post.instagramPostId && ' · Instagram ✓'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Edit post */}
            <div className="lg:col-span-2">
              {editingPost ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">{editingPost.topic}</h2>
                    <div className="flex gap-2">
                      {editingPost.status !== 'published' && (
                        <button
                          onClick={() => handlePublish(editingPost.id)}
                          disabled={publishing === editingPost.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {publishing === editingPost.id ? 'Publication...' : 'Publier maintenant'}
                        </button>
                      )}
                      <button
                        onClick={handleSavePost}
                        disabled={loading}
                        className="bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50"
                      >
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => handleDelete(editingPost.id)}
                        className="text-red-600 hover:text-red-700 px-3 py-2 text-sm transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {editingPost.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {editingPost.errorMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      LinkedIn
                      {editingPost.linkedinPostId && <span className="ml-2 text-green-600 text-xs">✓ Publié</span>}
                    </label>
                    <textarea
                      value={editingPost.contentLI ?? ''}
                      onChange={e => setEditingPost({ ...editingPost, contentLI: e.target.value })}
                      rows={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">{(editingPost.contentLI ?? '').length} caractères</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Instagram
                      {editingPost.instagramPostId && <span className="ml-2 text-green-600 text-xs">✓ Publié</span>}
                    </label>
                    <textarea
                      value={editingPost.contentIG ?? ''}
                      onChange={e => setEditingPost({ ...editingPost, contentIG: e.target.value })}
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">{(editingPost.contentIG ?? '').length} caractères</p>
                  </div>

                  {editingPost.imagePrompt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Prompt image (pour génération IA)</label>
                      <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 italic">{editingPost.imagePrompt}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 flex gap-4">
                    <span>Créé le {new Date(editingPost.createdAt).toLocaleString('fr-FR')}</span>
                    {editingPost.publishedAt && (
                      <span>Publié le {new Date(editingPost.publishedAt).toLocaleString('fr-FR')}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <p className="text-4xl mb-3">📝</p>
                    <p>Sélectionnez un post ou générez-en un nouveau</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'config' && config && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Identité de l&apos;entreprise</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;entreprise</label>
                <input
                  value={config.companyName}
                  onChange={e => setConfig({ ...config, companyName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description de l&apos;entreprise</label>
                <textarea
                  value={config.companyDesc}
                  onChange={e => setConfig({ ...config, companyDesc: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ton</label>
                  <select
                    value={config.tone}
                    onChange={e => setConfig({ ...config, tone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
                  >
                    <option value="professionnel">Professionnel</option>
                    <option value="expert">Expert</option>
                    <option value="accessible">Accessible</option>
                    <option value="enthousiaste">Enthousiaste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience cible</label>
                  <input
                    value={config.targetAudience}
                    onChange={e => setConfig({ ...config, targetAudience: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujets automatiques <span className="text-gray-400">(séparés par des virgules)</span>
                </label>
                <input
                  value={config.topics}
                  onChange={e => setConfig({ ...config, topics: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Planification automatique</h2>
              <p className="text-sm text-gray-500">Le cron Vercel se déclenche tous les mardis et jeudis à 9h. Modifiez <code className="bg-gray-100 px-1 rounded">vercel.json</code> pour changer le planning.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jours de publication</label>
                  <input
                    value={config.scheduleDays}
                    onChange={e => setConfig({ ...config, scheduleDays: e.target.value })}
                    placeholder="mardi,jeudi"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure (UTC)</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={config.scheduleHour}
                    onChange={e => setConfig({ ...config, scheduleHour: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Réseaux sociaux</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">LinkedIn</p>
                    <p className="text-xs text-gray-400 mt-0.5">Variables: LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.linkedinEnabled}
                      onChange={e => setConfig({ ...config, linkedinEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-800"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Instagram</p>
                    <p className="text-xs text-gray-400 mt-0.5">Variables: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.instagramEnabled}
                      onChange={e => setConfig({ ...config, instagramEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-800"></div>
                  </label>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Variables d&apos;environnement à configurer sur Vercel :</p>
                <ul className="space-y-1 text-xs font-mono">
                  <li>ANTHROPIC_API_KEY — Clé API Claude</li>
                  <li>LINKEDIN_ACCESS_TOKEN — Token OAuth LinkedIn</li>
                  <li>LINKEDIN_PERSON_URN — Votre URN LinkedIn (ex: abc123)</li>
                  <li>INSTAGRAM_ACCESS_TOKEN — Token de page Meta</li>
                  <li>INSTAGRAM_ACCOUNT_ID — ID compte Instagram Business</li>
                  <li>CRON_SECRET — Secret pour sécuriser le cron</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full bg-brand-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50"
            >
              {savingConfig ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
