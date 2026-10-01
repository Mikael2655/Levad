'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface SocialPost {
  id: number
  topic: string
  contentLI: string | null
  contentIG: string | null
  imagePrompt: string | null
  imageUrl?: string | null
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
  notifyEmail: string
  linkedinEnabled: boolean
  instagramEnabled: boolean
}

const STATUS = {
  draft:      { label: 'À valider',  color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  scheduled:  { label: 'Validé',     color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  published:  { label: 'Publié',     color: 'bg-green-100 text-green-700',  dot: 'bg-green-400' },
  failed:     { label: 'Échec',      color: 'bg-red-100 text-red-700',      dot: 'bg-red-400' },
}

function SocialPageInner() {
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [tab, setTab] = useState<'posts' | 'config'>('posts')
  const [selected, setSelected] = useState<SocialPost | null>(null)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [topic, setTopic] = useState('')
  const [activeTab, setActiveTab] = useState<'linkedin' | 'instagram'>('linkedin')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [searchingUnsplash, setSearchingUnsplash] = useState(false)
  const [unsplashPhotos, setUnsplashPhotos] = useState<{ id: string; url: string; alt: string; author: string; link: string }[]>([])
  const [unsplashPage, setUnsplashPage] = useState(1)
  const [customImagePrompt, setCustomImagePrompt] = useState<string | null>(null)
  const [customUnsplashKeywords, setCustomUnsplashKeywords] = useState<string | null>(null)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [listFilter, setListFilter] = useState<'queue' | 'published' | 'failed'>('queue')
  const [fillCount, setFillCount] = useState(10)
  const [fillProgress, setFillProgress] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/social/posts')
    const data = await res.json()
    const list: SocialPost[] = data.posts ?? []
    setPosts(list)
    const idParam = searchParams.get('post')
    if (idParam) {
      const found = list.find(p => p.id === parseInt(idParam))
      if (found) setSelected(found)
    }
  }, [searchParams])

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/social/config')
    const data = await res.json()
    setConfig(data.config)
  }, [])

  useEffect(() => {
    loadPosts()
    loadConfig()
  }, [loadPosts, loadConfig])

  // Reset image state when switching post
  function selectPost(post: SocialPost) {
    setSelected(post)
    setSelectedPhotoUrl(null)
    setGeneratedImageUrl(null)
    if (post.status === 'scheduled' || post.status === 'draft') {
      fetch(`/api/social/posts?id=${post.id}`).then(r => r.json()).then(d => {
        if (d.post?.imageUrl) setSelectedPhotoUrl(d.post.imageUrl)
      }).catch(() => {})
    }
    setUnsplashPhotos([])
    setCustomImagePrompt(null)
    setCustomUnsplashKeywords(null)
    setShowPreview(false)
  }

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
        selectPost(data.post)
        showToast('Post généré — vérifiez et publiez quand vous êtes prêt')
      } else {
        showToast(data.error ?? 'Erreur de génération', false)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function saveContent(post: SocialPost) {
    await fetch('/api/social/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, topic: post.topic, contentLI: post.contentLI, contentIG: post.contentIG }),
    })
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/social/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, topic: selected.topic, contentLI: selected.contentLI, contentIG: selected.contentIG }),
      })
      const data = await res.json()
      if (data.post) {
        setSelected(data.post)
        await loadPosts()
        showToast('Modifications sauvegardées')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!selected) return
    setPublishing(true)
    try {
      // Auto-save modifications before publishing
      await saveContent(selected)

      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selected.id, imageUrl: selectedPhotoUrl }),
      })
      const data = await res.json()
      await loadPosts()
      if (data.success) {
        showToast('Post publié avec succès !')
        setSelected(prev => prev ? { ...prev, status: 'published', publishedAt: new Date().toISOString(),
          linkedinPostId: data.linkedinPostId, instagramPostId: data.instagramPostId } : null)
        setShowPreview(false)
      } else if (data.errors?.length > 0) {
        showToast(data.errors.join(' — '), false)
        setSelected(prev => prev ? { ...prev, status: 'failed', errorMessage: data.errors.join(' | ') } : null)
      }
    } finally {
      setPublishing(false)
    }
  }

  function formatSlot(iso: string | null) {
    if (!iso) return ''
    return new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  }

  async function handleValidate(validated: boolean) {
    if (!selected) return
    const res = await fetch('/api/social/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'validate',
        id: selected.id,
        validated,
        topic: selected.topic,
        contentLI: selected.contentLI,
        contentIG: selected.contentIG,
        imageUrl: selectedPhotoUrl,
      }),
    })
    const data = await res.json()
    if (data.post) {
      setSelected(data.post)
      await loadPosts()
      showToast(validated ? 'Post validé : il sera publié automatiquement à son créneau' : 'Validation retirée')
    } else {
      showToast(data.error ?? 'Erreur', false)
    }
  }

  async function handleMove(id: number, direction: 'up' | 'down') {
    await fetch('/api/social/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', id, direction }),
    })
    await loadPosts()
  }

  async function handleFill() {
    for (let i = 1; i <= fillCount; i++) {
      setFillProgress(`Génération ${i}/${fillCount}…`)
      try {
        const res = await fetch('/api/social/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate' }),
        })
        const data = await res.json()
        if (!data.post) {
          showToast(data.error ?? 'Erreur de génération', false)
          break
        }
        await loadPosts()
      } catch {
        showToast('Erreur de génération', false)
        break
      }
    }
    setFillProgress(null)
  }

  async function handleDelete() {
    if (!selected || !confirm('Supprimer ce post définitivement ?')) return
    await fetch(`/api/social/posts?id=${selected.id}`, { method: 'DELETE' })
    setSelected(null)
    await loadPosts()
    showToast('Post supprimé')
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
      showToast('Configuration sauvegardée')
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleGenerateImage() {
    if (!selected?.imagePrompt) return
    setGeneratingImage(true)
    setGeneratedImageUrl(null)
    setUnsplashPhotos([])
    setSelectedPhotoUrl(null)
    try {
      const res = await fetch('/api/social/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customImagePrompt ?? selected.imagePrompt }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl)
        setSelectedPhotoUrl(data.imageUrl)
      } else {
        showToast(data.error ?? 'Erreur génération image', false)
      }
    } finally {
      setGeneratingImage(false)
    }
  }

  async function handleSearchUnsplash(page = 1) {
    if (!selected) return
    setSearchingUnsplash(true)
    if (page === 1) { setGeneratedImageUrl(null); setUnsplashPhotos([]); setSelectedPhotoUrl(null) }
    try {
      const res = await fetch('/api/social/unsplash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: customUnsplashKeywords ?? selected.topic, page }),
      })
      const data = await res.json()
      if (data.photos) { setUnsplashPhotos(data.photos); setUnsplashPage(page) }
      else showToast(data.error ?? 'Erreur recherche Unsplash', false)
    } finally {
      setSearchingUnsplash(false)
    }
  }

  const drafts = posts.filter(p => p.status === 'draft')
  const scheduled = posts.filter(p => p.status === 'scheduled')
  const published = posts.filter(p => p.status === 'published')
  const failed = posts.filter(p => p.status === 'failed')
  const byDate = (a: SocialPost, b: SocialPost) =>
    (a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity) - (b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity) || a.id - b.id
  const queue = [...scheduled].sort(byDate).concat([...drafts].sort(byDate))
  const listed = listFilter === 'queue' ? queue : listFilter === 'published' ? published : failed

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Photo" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300" onClick={() => setLightboxUrl(null)}>✕</button>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && selected && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Prévisualisation LinkedIn</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            {/* LinkedIn card mock */}
            <div className="p-5">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-brand-800 flex items-center justify-center text-white font-bold text-lg">
                      {config?.companyName?.[0] ?? 'L'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{config?.companyName ?? 'Levad'}</p>
                      <p className="text-xs text-gray-400">Maintenant · 🌐</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selected.contentLI}
                  </div>
                </div>
                {selectedPhotoUrl && (
                  <img src={selectedPhotoUrl} alt="Image du post" className="w-full object-cover max-h-64" />
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                Modifier
              </button>
              <button onClick={handlePublish} disabled={publishing}
                className="px-5 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-semibold disabled:opacity-50 flex items-center gap-2">
                {publishing ? (
                  <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Publication...</>
                ) : '🔗 Publier maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-brand-800 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <span className="text-brand-800 font-black text-lg">L</span>
            </div>
            <div>
              <span className="font-bold text-lg">Levad</span>
              <span className="text-blue-300 ml-2 text-sm">/ Réseaux sociaux</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {drafts.length > 0 && (
              <span className="bg-amber-400 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-xs">
                {drafts.length} à valider
              </span>
            )}
            {scheduled.length > 0 && (
              <span className="bg-blue-400 text-blue-900 font-bold px-2.5 py-0.5 rounded-full text-xs">
                {scheduled.length} validé{scheduled.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {(['posts', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t ? 'bg-brand-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {t === 'posts' ? 'Publications' : 'Configuration'}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900 mb-1">Générer un post</h2>
                <p className="text-xs text-gray-400 mb-4">Claude AI rédige les textes LinkedIn et Instagram — vous relisez avant de publier.</p>
                <div className="space-y-3">
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !generating && handleGenerate()}
                    placeholder="Ex: pourquoi passer à la GED en 2025..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800"
                  />
                  <button onClick={handleGenerate} disabled={generating || !topic.trim()}
                    className="w-full bg-brand-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {generating ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Génération...</>
                    ) : 'Générer avec Claude AI'}
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Ou préparer la file à l&apos;avance : Claude choisit les sujets, vous validez quand vous voulez.</p>
                  <div className="flex gap-2">
                    <select value={fillCount} onChange={e => setFillCount(parseInt(e.target.value))} disabled={!!fillProgress}
                      className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white">
                      {[5, 10, 20].map(n => <option key={n} value={n}>{n} posts</option>)}
                    </select>
                    <button onClick={handleFill} disabled={!!fillProgress}
                      className="flex-1 bg-white border border-brand-800 text-brand-800 py-2 rounded-xl text-sm font-semibold hover:bg-brand-800 hover:text-white transition disabled:opacity-50">
                      {fillProgress ?? 'Remplir la file'}
                    </button>
                  </div>
                </div>
                {config && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Suggestions rapides</p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.topics.split(',').map(t => (
                        <button key={t} onClick={() => setTopic(t.trim())}
                          className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-brand-800 hover:text-white transition">
                          {t.trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl border border-amber-200 p-3">
                  <p className="text-2xl font-bold text-amber-600">{drafts.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">À valider</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-3">
                  <p className="text-2xl font-bold text-blue-600">{scheduled.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Validés</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-3">
                  <p className="text-2xl font-bold text-green-600">{published.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Publiés</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-3 py-3 border-b border-gray-100 flex gap-1">
                  {([
                    ['queue', `File d'attente (${queue.length})`],
                    ['published', `Publiés (${published.length})`],
                    ...(failed.length > 0 ? [['failed', `Échecs (${failed.length})`]] : []),
                  ] as [typeof listFilter, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setListFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${listFilter === key ? 'bg-brand-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {listed.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">📝</p>
                    <p className="text-sm">{listFilter === 'queue' ? 'La file est vide : cliquez sur « Remplir la file »' : 'Aucun post'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[32rem] overflow-y-auto">
                    {listed.map((post, idx) => {
                      const s = STATUS[post.status as keyof typeof STATUS] ?? STATUS.draft
                      const inQueue = listFilter === 'queue'
                      const prev = listed[idx - 1]
                      const next = listed[idx + 1]
                      const canUp = inQueue && prev && prev.status === post.status
                      const canDown = inQueue && next && next.status === post.status
                      return (
                        <div key={post.id}
                          className={`flex items-stretch ${selected?.id === post.id ? 'bg-blue-50 border-l-2 border-brand-800' : ''}`}>
                          {inQueue && (
                            <div className="flex flex-col justify-center px-1.5 text-gray-400">
                              <button onClick={() => handleMove(post.id, 'up')} disabled={!canUp} title="Monter"
                                className="leading-none px-1 hover:text-brand-800 disabled:opacity-20">▲</button>
                              <button onClick={() => handleMove(post.id, 'down')} disabled={!canDown} title="Descendre"
                                className="leading-none px-1 hover:text-brand-800 disabled:opacity-20">▼</button>
                            </div>
                          )}
                          <button onClick={() => selectPost(post)} className="flex-1 min-w-0 text-left p-4 hover:bg-gray-50 transition">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 line-clamp-1">{post.topic}</p>
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 ${s.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                                {s.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {inQueue && post.scheduledAt
                                ? `📅 ${formatSlot(post.scheduledAt)}`
                                : new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('fr-FR')}
                              {post.linkedinPostId && ' · LI ✓'}
                              {post.instagramPostId && ' · IG ✓'}
                            </p>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Éditeur de post */}
            <div className="lg:col-span-3">
              {selected ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Post header */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <input
                          value={selected.topic}
                          onChange={e => setSelected({ ...selected, topic: e.target.value })}
                          disabled={selected.status === 'published'}
                          className="font-semibold text-gray-900 text-lg bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-800 focus:outline-none w-full disabled:cursor-default"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                          Généré le {new Date(selected.createdAt).toLocaleString('fr-FR')}
                          {selected.publishedAt && ` · Publié le ${new Date(selected.publishedAt).toLocaleString('fr-FR')}`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap justify-end items-center">
                        {selected.status !== 'published' && (
                          <>
                            <button onClick={handleSave} disabled={saving}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 font-medium">
                              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                            <button onClick={() => setShowPreview(true)}
                              className="px-4 py-1.5 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-semibold">
                              Prévisualiser →
                            </button>
                          </>
                        )}
                        {selected.status === 'published' && (
                          <span className="px-4 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg font-semibold">✓ Publié</span>
                        )}
                        <button onClick={handleDelete} className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>

                  {selected.errorMessage && (
                    <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                      <strong>Erreur :</strong> {selected.errorMessage}
                    </div>
                  )}

                  {/* Validation */}
                  {(selected.status === 'draft' || selected.status === 'scheduled') && (
                    <div className={`mx-6 mt-4 p-4 rounded-xl border ${selected.status === 'scheduled' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-3 flex-wrap justify-between">
                        <div>
                          <p className={`text-sm font-semibold ${selected.status === 'scheduled' ? 'text-green-800' : 'text-amber-800'}`}>
                            {selected.status === 'scheduled' ? '✅ Validé' : '⏳ À valider'}
                            {selected.scheduledAt && ` · créneau prévu : ${formatSlot(selected.scheduledAt)}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {selected.status === 'scheduled'
                              ? 'Sera publié automatiquement à son créneau (avec l\'image choisie).'
                              : 'Rien n\'est publié tant que vous n\'avez pas validé. Choisissez l\'image puis validez.'}
                          </p>
                        </div>
                        {selected.status === 'scheduled' ? (
                          <button onClick={() => handleValidate(false)}
                            className="px-4 py-1.5 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-100 font-medium transition">
                            Retirer la validation
                          </button>
                        ) : (
                          <button onClick={() => handleValidate(true)}
                            className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition">
                            ✅ Valider pour publication
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Network tabs */}
                  <div className="flex border-b border-gray-100 px-6 pt-4">
                    {(['linkedin', 'instagram'] as const).map(net => (
                      <button key={net} onClick={() => setActiveTab(net)}
                        className={`mr-6 pb-3 text-sm font-medium border-b-2 transition -mb-px capitalize ${
                          activeTab === net ? 'border-brand-800 text-brand-800' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}>
                        {net === 'linkedin' ? '💼 LinkedIn' : '📸 Instagram'}
                        {net === 'linkedin' && selected.linkedinPostId && <span className="ml-1 text-green-500">✓</span>}
                        {net === 'instagram' && selected.instagramPostId && <span className="ml-1 text-green-500">✓</span>}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    {activeTab === 'linkedin' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Texte LinkedIn</label>
                          <span className="text-xs text-gray-400">{(selected.contentLI ?? '').length} car.</span>
                        </div>
                        <textarea
                          value={selected.contentLI ?? ''}
                          onChange={e => setSelected({ ...selected, contentLI: e.target.value })}
                          disabled={selected.status === 'published'}
                          rows={12}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800 resize-none leading-relaxed disabled:bg-gray-50 disabled:text-gray-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">Recommandé : 150–300 mots. Cliquez dans le texte pour modifier.</p>
                      </div>
                    )}

                    {activeTab === 'instagram' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Texte Instagram</label>
                          <span className="text-xs text-gray-400">{(selected.contentIG ?? '').length} car.</span>
                        </div>
                        <textarea
                          value={selected.contentIG ?? ''}
                          onChange={e => setSelected({ ...selected, contentIG: e.target.value })}
                          disabled={selected.status === 'published'}
                          rows={10}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800 resize-none leading-relaxed disabled:bg-gray-50 disabled:text-gray-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">Instagram nécessite une image. Définissez INSTAGRAM_DEFAULT_IMAGE_URL dans vos variables.</p>
                      </div>
                    )}

                    {selected.imagePrompt && (
                      <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Image</p>
                        <textarea
                          value={customImagePrompt ?? selected.imagePrompt}
                          onChange={e => setCustomImagePrompt(e.target.value)}
                          rows={3}
                          className="w-full text-sm text-purple-900 bg-white border border-purple-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                        />
                        <input
                          type="text"
                          placeholder="Mots-clés Unsplash (ex: office meeting professional)"
                          value={customUnsplashKeywords ?? selected.topic}
                          onChange={e => setCustomUnsplashKeywords(e.target.value || null)}
                          className="w-full text-sm border border-purple-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 mb-3"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={handleGenerateImage} disabled={generatingImage || searchingUnsplash}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium flex items-center gap-2">
                            {generatingImage ? (
                              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Génération...</>
                            ) : '🎨 Générer avec IA'}
                          </button>
                          <button onClick={() => handleSearchUnsplash(1)} disabled={generatingImage || searchingUnsplash}
                            className="px-4 py-2 bg-white border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition disabled:opacity-50 font-medium flex items-center gap-2">
                            {searchingUnsplash ? (
                              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Recherche...</>
                            ) : '🔍 Photos Unsplash'}
                          </button>
                        </div>

                        {/* AI generated image */}
                        {generatedImageUrl && (
                          <div className="mt-3">
                            <p className="text-xs text-purple-600 mb-1">Cliquez sur l&apos;image pour la sélectionner</p>
                            <div
                              className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition ${selectedPhotoUrl === generatedImageUrl ? 'border-purple-500' : 'border-transparent'}`}
                              onClick={() => setSelectedPhotoUrl(prev => prev === generatedImageUrl ? null : generatedImageUrl)}>
                              <img src={generatedImageUrl} alt="Image générée" className="w-full rounded-lg" />
                              {selectedPhotoUrl === generatedImageUrl && (
                                <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">✓</div>
                              )}
                            </div>
                            <button onClick={() => setLightboxUrl(generatedImageUrl)} className="mt-1 text-xs text-purple-600 hover:underline">
                              🔍 Voir en grand
                            </button>
                            {' · '}
                            <a href={generatedImageUrl} download="levad-post.png" target="_blank" rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:underline">
                              ⬇️ Télécharger
                            </a>
                          </div>
                        )}

                        {/* Unsplash photos */}
                        {unsplashPhotos.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-purple-600">Cliquez pour sélectionner · double-clic pour agrandir</p>
                              <button onClick={() => handleSearchUnsplash(unsplashPage + 1)} disabled={searchingUnsplash}
                                className="text-xs text-purple-600 hover:underline disabled:opacity-50">
                                {searchingUnsplash ? 'Chargement...' : '🔄 Autres photos'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {unsplashPhotos.map(photo => (
                                <div key={photo.id} className="relative">
                                  <div
                                    className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition ${selectedPhotoUrl === photo.url ? 'border-purple-500' : 'border-transparent'}`}
                                    onClick={() => setSelectedPhotoUrl(prev => prev === photo.url ? null : photo.url)}
                                    onDoubleClick={() => setLightboxUrl(photo.url)}>
                                    <img src={photo.url} alt={photo.alt} className="w-full h-32 object-cover hover:opacity-90 transition" />
                                    {selectedPhotoUrl === photo.url && (
                                      <div className="absolute top-1 right-1 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✓</div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5 truncate">📷 {photo.author}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedPhotoUrl && (
                          <div className="mt-3 p-2 bg-purple-100 rounded-lg flex items-center gap-2">
                            <img src={selectedPhotoUrl} alt="Sélectionnée" className="w-10 h-10 object-cover rounded" />
                            <p className="text-xs text-purple-700 font-medium flex-1">Image sélectionnée pour la prévisualisation</p>
                            <button onClick={() => setSelectedPhotoUrl(null)} className="text-purple-400 hover:text-purple-700 text-lg leading-none">✕</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full min-h-96 flex items-center justify-center">
                  <div className="text-center text-gray-400 p-8">
                    {drafts.length > 0 ? (
                      <>
                        <p className="text-5xl mb-4">📬</p>
                        <p className="font-medium text-gray-600 text-lg">{drafts.length} post{drafts.length > 1 ? 's' : ''} en attente de validation</p>
                        <p className="text-sm mt-1">Cliquez sur un post dans la liste pour le lire et le publier</p>
                      </>
                    ) : (
                      <>
                        <p className="text-5xl mb-4">✨</p>
                        <p className="font-medium text-gray-600">Prêt à créer votre prochain post ?</p>
                        <p className="text-sm mt-1">Entrez un sujet à gauche et laissez Claude AI rédiger</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'config' && config && (
          <div className="max-w-xl space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Entreprise</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input value={config.companyName} onChange={e => setConfig({ ...config, companyName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={config.companyDesc} onChange={e => setConfig({ ...config, companyDesc: e.target.value })}
                  rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ton</label>
                  <select value={config.tone} onChange={e => setConfig({ ...config, tone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-800">
                    <option value="professionnel">Professionnel</option>
                    <option value="expert">Expert</option>
                    <option value="accessible">Accessible</option>
                    <option value="enthousiaste">Enthousiaste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience cible</label>
                  <input value={config.targetAudience} onChange={e => setConfig({ ...config, targetAudience: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sujets <span className="text-gray-400 font-normal">(séparés par des virgules)</span></label>
                <input value={config.topics} onChange={e => setConfig({ ...config, topics: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de notification</label>
                <input value={config.notifyEmail} onChange={e => setConfig({ ...config, notifyEmail: e.target.value })}
                  type="email" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800" />
                <p className="text-xs text-gray-400 mt-1">Reçoit un email dès qu&apos;un post est prêt à valider</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Réseaux actifs</h2>
              {[
                { key: 'linkedinEnabled', label: 'LinkedIn', vars: 'LINKEDIN_ACCESS_TOKEN' },
                { key: 'instagramEnabled', label: 'Instagram', vars: 'INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_ACCOUNT_ID' },
              ].map(({ key, label, vars }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{vars}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={config[key as keyof Config] as boolean}
                      onChange={e => setConfig({ ...config, [key]: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-800"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
              <p className="font-semibold text-amber-900 mb-2">Variables à configurer sur Vercel</p>
              <div className="space-y-1 font-mono text-xs text-amber-800">
                <p>ANTHROPIC_API_KEY</p>
                <p>RESEND_API_KEY</p>
                <p>NEXT_PUBLIC_APP_URL</p>
                <p>LINKEDIN_ACCESS_TOKEN</p>
                <p>INSTAGRAM_ACCESS_TOKEN</p>
                <p>INSTAGRAM_ACCOUNT_ID</p>
                <p>CRON_SECRET</p>
                <p>DATABASE_URL</p>
              </div>
            </div>

            <button onClick={handleSaveConfig} disabled={savingConfig}
              className="w-full bg-brand-800 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50">
              {savingConfig ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function SocialPage() {
  return (
    <Suspense>
      <SocialPageInner />
    </Suspense>
  )
}
