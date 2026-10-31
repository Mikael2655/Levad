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
  draft:     { label: 'À valider', color: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',       dot: 'bg-amber-500' },
  scheduled: { label: 'Validé',    color: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
  published: { label: 'Publié',    color: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',      dot: 'bg-slate-400' },
  failed:    { label: 'Échec',     color: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',             dot: 'bg-red-500' },
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
  const [fillError, setFillError] = useState<string | null>(null)
  const [hold, setHold] = useState<string | null>(null)
  const [persona, setPersona] = useState<{ bio: string; rhythm: number }>({ bio: '', rhythm: 4 })
  const [savingPersona, setSavingPersona] = useState(false)
  const [personalKind, setPersonalKind] = useState<'metier' | 'parcours'>('metier')
  const [personalHint, setPersonalHint] = useState('')
  const [generatingPersonal, setGeneratingPersonal] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [rewriteAllProgress, setRewriteAllProgress] = useState<string | null>(null)
  const [previousText, setPreviousText] = useState<{ id: number; li: string | null; ig: string | null } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/social/posts')
    const data = await res.json()
    const list: SocialPost[] = data.posts ?? []
    setPosts(list)
    setHold(data.hold ?? null)
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
    try {
      const pr = await fetch('/api/social/persona')
      if (pr.ok) setPersona(await pr.json())
    } catch { /* section facultative */ }
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

  async function handleSavePersona() {
    setSavingPersona(true)
    try {
      const res = await fetch('/api/social/persona', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona),
      })
      showToast(res.ok ? 'Mon histoire sauvegardée' : 'Erreur de sauvegarde', res.ok)
    } finally {
      setSavingPersona(false)
    }
  }

  async function handleGeneratePersonal() {
    setGeneratingPersonal(true)
    try {
      const res = await fetch('/api/social/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'personal', kind: personalKind, hint: personalHint }),
      })
      const text = await res.text()
      let data: { post?: SocialPost; error?: string } = {}
      try { data = JSON.parse(text) } catch { /* réponse non JSON */ }
      if (data.post) {
        setPersonalHint('')
        await loadPosts()
        setListFilter('queue')
        selectPost(data.post)
        showToast('Post en votre nom ajouté à la file : relisez-le avec soin')
      } else {
        showToast(data.error ?? `Erreur de génération (${res.status})`, false)
      }
    } finally {
      setGeneratingPersonal(false)
    }
  }

  async function rewriteCall(body: object): Promise<SocialPost> {
    const res = await fetch('/api/social/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rewrite', ...body }),
    })
    const text = await res.text()
    let data: { post?: SocialPost; error?: string } = {}
    try { data = JSON.parse(text) } catch { /* réponse non JSON */ }
    if (!data.post) throw new Error(data.error ?? `Erreur serveur ${res.status}`)
    return data.post
  }

  async function handleRewrite() {
    if (!selected) return
    setRewriting(true)
    try {
      const before = { id: selected.id, li: selected.contentLI, ig: selected.contentIG }
      const post = await rewriteCall({ id: selected.id, contentLI: selected.contentLI ?? '', contentIG: selected.contentIG ?? '' })
      setPreviousText(before)
      setSelected(prev => prev && prev.id === post.id ? { ...prev, contentLI: post.contentLI, contentIG: post.contentIG } : prev)
      await loadPosts()
      showToast('Texte réécrit, plus percutant : relisez-le')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur de réécriture', false)
    } finally {
      setRewriting(false)
    }
  }

  async function handleUndoRewrite() {
    if (!previousText || !selected || selected.id !== previousText.id) return
    const restored = { ...selected, contentLI: previousText.li, contentIG: previousText.ig }
    setSelected(restored)
    await saveContent(restored)
    setPreviousText(null)
    await loadPosts()
    showToast('Version précédente rétablie')
  }

  async function handleRewriteAll() {
    const targets = drafts
    if (targets.length === 0) return
    if (!confirm(`Réécrire ${targets.length} post${targets.length > 1 ? 's' : ''} « à valider » de façon plus percutante ? Les textes actuels seront remplacés (les posts validés ne sont pas touchés).`)) return
    let done = 0
    for (let i = 0; i < targets.length; i++) {
      setRewriteAllProgress(`Réécriture ${i + 1}/${targets.length}…`)
      try {
        await rewriteCall({ id: targets[i].id })
        done++
      } catch (e) {
        showToast(`Arrêt après ${done} : ${e instanceof Error ? e.message : String(e)}`, false)
        break
      }
    }
    setRewriteAllProgress(null)
    await loadPosts()
    if (selected && targets.some(p => p.id === selected.id)) {
      const fresh = await fetch(`/api/social/posts?id=${selected.id}`).then(r => r.json()).catch(() => null)
      if (fresh?.post) setSelected(fresh.post)
    }
    if (done > 0) showToast(`${done} post${done > 1 ? 's' : ''} réécrit${done > 1 ? 's' : ''}`)
  }

  async function handleShift() {
    await fetch('/api/social/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shift' }),
    })
    await loadPosts()
    showToast('Prochaine publication décalée d\'un créneau, toute la file suit')
  }

  async function handleHold(day: string | null) {
    await fetch('/api/social/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hold', day }),
    })
    await loadPosts()
    showToast(day ? `Aucune publication avant le ${new Date(day).toLocaleDateString('fr-FR')}` : 'Décalage annulé')
  }

  async function queueCall(body: object) {
    const res = await fetch('/api/social/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let data: { error?: string; picked?: unknown; post?: unknown } = {}
    try { data = JSON.parse(text) } catch { /* réponse non JSON (délai dépassé) */ }
    if (!res.ok || data.error) {
      throw new Error(data.error ?? `Erreur serveur ${res.status}${res.status === 504 ? ' (délai dépassé)' : ''}`)
    }
    return data
  }

  async function handleFill() {
    setFillError(null)
    let done = 0
    for (let i = 1; i <= fillCount; i++) {
      try {
        setFillProgress(`Recherche du sujet ${i}/${fillCount}…`)
        const { picked } = await queueCall({ action: 'pick' })
        setFillProgress(`Rédaction ${i}/${fillCount}…`)
        await queueCall({ action: 'write', picked })
        done++
        await loadPosts()
      } catch (e) {
        setFillError(`Arrêt après ${done} post${done > 1 ? 's' : ''} : ${e instanceof Error ? e.message : String(e)}`)
        break
      }
    }
    setFillProgress(null)
    if (done > 0) showToast(`${done} post${done > 1 ? 's' : ''} ajouté${done > 1 ? 's' : ''} à la file`)
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-md shadow-lg text-sm font-medium transition-all
          ${toast.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Photo" className="max-w-full max-h-full rounded-md object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-slate-300" onClick={() => setLightboxUrl(null)}>✕</button>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && selected && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Prévisualisation LinkedIn</h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-600 text-xl">✕</button>
            </div>
            {/* LinkedIn card mock */}
            <div className="p-5">
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-brand-800 flex items-center justify-center text-white font-bold text-lg">
                      {config?.companyName?.[0] ?? 'L'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{config?.companyName ?? 'Levad'}</p>
                      <p className="text-xs text-slate-500">Maintenant · 🌐</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selected.contentLI}
                  </div>
                </div>
                {selectedPhotoUrl && (
                  <img src={selectedPhotoUrl} alt="Image du post" className="w-full object-cover max-h-64" />
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 font-medium">
                Modifier
              </button>
              <button onClick={handlePublish} disabled={publishing}
                className="px-5 py-2 text-sm bg-brand-800 text-white rounded-md hover:bg-brand-900 font-medium disabled:opacity-50 flex items-center gap-2">
                {publishing ? (
                  <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Publication...</>
                ) : 'Publier maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-brand-800 rounded-md flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-base">L</span>
            </div>
            <div className="min-w-0 truncate">
              <span className="font-semibold text-slate-900">Levad</span>
              <span className="text-slate-500 ml-2 text-sm hidden sm:inline">Réseaux sociaux</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {drafts.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {drafts.length} à valider
              </span>
            )}
            {scheduled.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {scheduled.length} validé{scheduled.length > 1 ? 's' : ''}
              </span>
            )}
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }}
              className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition">
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b border-slate-200">
          {(['posts', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 -mb-px text-sm font-medium border-b-2 transition ${
                tab === t ? 'border-brand-800 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              {t === 'posts' ? 'Publications' : 'Configuration'}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">Générer un post</h2>
                <p className="text-xs text-slate-500 mb-4">Claude AI rédige les textes LinkedIn et Instagram — vous relisez avant de publier.</p>
                <div className="space-y-3">
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !generating && handleGenerate()}
                    placeholder="Ex: pourquoi passer à la GED en 2025..."
                    className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                  />
                  <button onClick={handleGenerate} disabled={generating || !topic.trim()}
                    className="w-full bg-brand-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-brand-900 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {generating ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Génération...</>
                    ) : 'Générer avec Claude AI'}
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">Ou préparer la file à l&apos;avance : Claude choisit les sujets, vous validez quand vous voulez.</p>
                  <div className="flex gap-2">
                    <select value={fillCount} onChange={e => setFillCount(parseInt(e.target.value))} disabled={!!fillProgress}
                      className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                      {[5, 10, 20].map(n => <option key={n} value={n}>{n} posts</option>)}
                    </select>
                    <button onClick={handleFill} disabled={!!fillProgress}
                      className="flex-1 bg-white border border-slate-300 text-slate-800 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50">
                      {fillProgress ?? 'Remplir la file'}
                    </button>
                  </div>
                  {fillError && <p className="text-xs text-red-600 mt-2 break-words">{fillError}</p>}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">
                    Ou écrire <strong className="text-slate-600">en votre nom</strong> (« je ») à partir de votre histoire.
                    {!persona.bio.trim() && <span className="text-amber-600"> Renseignez d&apos;abord « Mon histoire » dans l&apos;onglet Configuration.</span>}
                  </p>
                  <div className="flex gap-2 mb-2">
                    <select value={personalKind} onChange={e => setPersonalKind(e.target.value as 'metier' | 'parcours')}
                      className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                      <option value="metier">Mon métier</option>
                      <option value="parcours">Mon parcours</option>
                    </select>
                    <input value={personalHint} onChange={e => setPersonalHint(e.target.value)} maxLength={500}
                      placeholder="Précision (facultatif) : un épisode, une idée…"
                      className="flex-1 min-w-0 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800" />
                  </div>
                  <button onClick={handleGeneratePersonal} disabled={generatingPersonal || !persona.bio.trim()}
                    className="w-full bg-white border border-slate-300 text-slate-800 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50">
                    {generatingPersonal ? 'Rédaction en cours…' : 'Écrire un post en mon nom'}
                  </button>
                </div>
                {config && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">Suggestions rapides</p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.topics.split(',').map(t => (
                        <button key={t} onClick={() => setTopic(t.trim())}
                          className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md hover:bg-slate-200 transition">
                          {t.trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`grid gap-2 ${failed.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <button onClick={() => setListFilter('queue')}
                  className={`text-left bg-white rounded-lg border p-3 transition ${listFilter === 'queue' ? 'border-brand-800 ring-1 ring-brand-800' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-2xl font-semibold text-slate-900 tabular-nums">{queue.length}</p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">File d&apos;attente</p>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
                    <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{drafts.length} à valider</span>
                    <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{scheduled.length} validé{scheduled.length > 1 ? 's' : ''}</span>
                  </p>
                </button>
                <button onClick={() => setListFilter('published')}
                  className={`text-left bg-white rounded-lg border p-3 transition ${listFilter === 'published' ? 'border-brand-800 ring-1 ring-brand-800' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-2xl font-semibold text-slate-900 tabular-nums">{published.length}</p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">Publié{published.length > 1 ? 's' : ''}</p>
                </button>
                {failed.length > 0 && (
                  <button onClick={() => setListFilter('failed')}
                    className={`text-left bg-white rounded-lg border p-3 transition ${listFilter === 'failed' ? 'border-red-600 ring-1 ring-red-600' : 'border-slate-200 hover:border-slate-300'}`}>
                    <p className="text-2xl font-semibold text-red-700 tabular-nums">{failed.length}</p>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">Échec{failed.length > 1 ? 's' : ''}</p>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {listFilter === 'queue' && (
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 space-y-2">
                    <p className="text-xs text-slate-600">
                      {scheduled.length > 0 && scheduled[0].scheduledAt
                        ? <>Prochaine publication : <strong>{formatSlot([...scheduled].sort(byDate)[0].scheduledAt)}</strong></>
                        : 'Aucun post validé : rien ne sera publié.'}
                      {hold && <span className="block text-amber-800 mt-0.5">Décalage actif : rien avant le {new Date(hold).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}</span>}
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button onClick={handleShift}
                        className="px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-100 font-medium">
                        Décaler d&apos;un créneau
                      </button>
                      <label className="text-xs text-slate-500 flex items-center gap-1.5">
                        ou rien avant le
                        <input type="date" onChange={e => e.target.value && handleHold(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white" />
                      </label>
                      {drafts.length > 0 && (
                        <button onClick={handleRewriteAll} disabled={!!rewriteAllProgress}
                          className="px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-100 font-medium disabled:opacity-60">
                          {rewriteAllProgress ?? `Rendre punchy les ${drafts.length} à valider`}
                        </button>
                      )}
                      {hold && (
                        <button onClick={() => handleHold(null)}
                          className="px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50 rounded-md font-medium">
                          Annuler le décalage
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {listed.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-sm">{listFilter === 'queue' ? 'La file est vide : cliquez sur « Remplir la file »' : 'Aucun post'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
                    {listed.map((post, idx) => {
                      const s = STATUS[post.status as keyof typeof STATUS] ?? STATUS.draft
                      const inQueue = listFilter === 'queue'
                      const prev = listed[idx - 1]
                      const next = listed[idx + 1]
                      const canUp = inQueue && prev && prev.status === post.status
                      const canDown = inQueue && next && next.status === post.status
                      return (
                        <div key={post.id}
                          className={`flex items-stretch ${selected?.id === post.id ? 'bg-slate-50 border-l-2 border-brand-800' : ''}`}>
                          {inQueue && (
                            <div className="flex flex-col justify-center px-1.5 text-slate-500">
                              <button onClick={() => handleMove(post.id, 'up')} disabled={!canUp} title="Monter"
                                className="leading-none px-1 hover:text-brand-800 disabled:opacity-20">▲</button>
                              <button onClick={() => handleMove(post.id, 'down')} disabled={!canDown} title="Descendre"
                                className="leading-none px-1 hover:text-brand-800 disabled:opacity-20">▼</button>
                            </div>
                          )}
                          <button onClick={() => selectPost(post)} className="flex-1 min-w-0 text-left p-4 hover:bg-slate-50 transition">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-900 line-clamp-1">{post.topic.startsWith('En mon nom · ') ? <><span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-slate-600">Perso</span>{post.topic.replace('En mon nom · ', '')}</> : post.topic}</p>
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 ${s.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                                {s.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {inQueue && post.scheduledAt
                                ? formatSlot(post.scheduledAt)
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
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  {/* Post header */}
                  <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200">
                    <input
                      value={selected.topic}
                      onChange={e => setSelected({ ...selected, topic: e.target.value })}
                      disabled={selected.status === 'published'}
                      className="font-semibold text-slate-900 text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-800 focus:outline-none w-full disabled:cursor-default"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Généré le {new Date(selected.createdAt).toLocaleString('fr-FR')}
                      {selected.publishedAt && ` · Publié le ${new Date(selected.publishedAt).toLocaleString('fr-FR')}`}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {selected.status !== 'published' && (
                        <>
                          <button onClick={handleSave} disabled={saving}
                            className="px-3 py-1.5 text-sm border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition disabled:opacity-40 font-medium">
                            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                          </button>
                          <button onClick={handleRewrite} disabled={rewriting}
                            className="px-3 py-1.5 text-sm border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition disabled:opacity-50 font-medium">
                            {rewriting ? 'Réécriture…' : 'Rendre plus punchy'}
                          </button>
                          {previousText && previousText.id === selected.id && (
                            <button onClick={handleUndoRewrite}
                              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2">
                              Version précédente
                            </button>
                          )}
                          <button onClick={() => setShowPreview(true)}
                            className="px-4 py-1.5 text-sm bg-brand-800 text-white rounded-md hover:bg-brand-900 transition font-medium">
                            Prévisualiser
                          </button>
                        </>
                      )}
                      {selected.status === 'published' && (
                        <span className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 rounded-md font-medium">Publié</span>
                      )}
                      <button onClick={handleDelete} className="ml-auto px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition">
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {selected.errorMessage && (
                    <div className="mx-5 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                      <strong>Erreur :</strong> {selected.errorMessage}
                    </div>
                  )}

                  {/* Validation */}
                  {(selected.status === 'draft' || selected.status === 'scheduled') && (
                    <div className={`mx-5 sm:mx-6 mt-4 p-4 rounded-md border ${selected.status === 'scheduled' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-3 flex-wrap justify-between">
                        <div>
                          <p className={`text-sm font-semibold flex items-center gap-2 ${selected.status === 'scheduled' ? 'text-emerald-900' : 'text-amber-900'}`}>
                            <span className={`w-2 h-2 rounded-full ${selected.status === 'scheduled' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {selected.status === 'scheduled' ? 'Validé' : 'À valider'}
                            {selected.scheduledAt && <span className="font-normal">· créneau prévu : {formatSlot(selected.scheduledAt)}</span>}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {selected.status === 'scheduled'
                              ? 'Sera publié automatiquement à son créneau (avec l\'image choisie).'
                              : 'Rien n\'est publié tant que vous n\'avez pas validé. Choisissez l\'image puis validez.'}
                          </p>
                        </div>
                        {selected.status === 'scheduled' ? (
                          <button onClick={() => handleValidate(false)}
                            className="px-4 py-1.5 text-sm border border-emerald-300 bg-white text-emerald-800 rounded-md hover:bg-emerald-100 font-medium transition">
                            Retirer la validation
                          </button>
                        ) : (
                          <button onClick={() => handleValidate(true)}
                            className="px-4 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800 font-medium transition">
                            Valider pour publication
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Network tabs */}
                  <div className="flex border-b border-slate-200 px-5 sm:px-6 pt-4">
                    {(['linkedin', 'instagram'] as const).map(net => (
                      <button key={net} onClick={() => setActiveTab(net)}
                        className={`mr-6 pb-3 text-sm font-medium border-b-2 transition -mb-px capitalize ${
                          activeTab === net ? 'border-brand-800 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-600'
                        }`}>
                        {net === 'linkedin' ? 'LinkedIn' : 'Instagram'}
                        {net === 'linkedin' && selected.linkedinPostId && <span className="ml-1 text-emerald-600">✓</span>}
                        {net === 'instagram' && selected.instagramPostId && <span className="ml-1 text-emerald-600">✓</span>}
                      </button>
                    ))}
                  </div>

                  <div className="p-5 sm:p-6">
                    {activeTab === 'linkedin' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">Texte LinkedIn</label>
                          <span className="text-xs text-slate-500">{(selected.contentLI ?? '').length} car.</span>
                        </div>
                        <textarea
                          value={selected.contentLI ?? ''}
                          onChange={e => setSelected({ ...selected, contentLI: e.target.value })}
                          disabled={selected.status === 'published'}
                          rows={12}
                          className="w-full border border-slate-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 resize-none leading-relaxed disabled:bg-slate-50 disabled:text-slate-600"
                        />
                        <p className="text-xs text-slate-500 mt-1">Recommandé : 90 à 160 mots. Cliquez dans le texte pour modifier.</p>
                      </div>
                    )}

                    {activeTab === 'instagram' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">Texte Instagram</label>
                          <span className="text-xs text-slate-500">{(selected.contentIG ?? '').length} car.</span>
                        </div>
                        <textarea
                          value={selected.contentIG ?? ''}
                          onChange={e => setSelected({ ...selected, contentIG: e.target.value })}
                          disabled={selected.status === 'published'}
                          rows={10}
                          className="w-full border border-slate-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 resize-none leading-relaxed disabled:bg-slate-50 disabled:text-slate-600"
                        />
                        <p className="text-xs text-slate-500 mt-1">Instagram nécessite une image. Définissez INSTAGRAM_DEFAULT_IMAGE_URL dans vos variables.</p>
                      </div>
                    )}

                    {selected.imagePrompt && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Image</p>
                        <textarea
                          value={customImagePrompt ?? selected.imagePrompt}
                          onChange={e => setCustomImagePrompt(e.target.value)}
                          rows={3}
                          className="w-full text-sm text-slate-900 bg-white border border-slate-300 rounded-md px-3 py-2 mb-2 focus:outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 resize-none"
                        />
                        <input
                          type="text"
                          placeholder="Mots-clés Unsplash (ex: office meeting professional)"
                          value={customUnsplashKeywords ?? selected.topic}
                          onChange={e => setCustomUnsplashKeywords(e.target.value || null)}
                          className="w-full text-sm text-slate-900 border border-slate-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 mb-3"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={handleGenerateImage} disabled={generatingImage || searchingUnsplash}
                            className="px-4 py-2 bg-brand-800 text-white text-sm rounded-md hover:bg-brand-900 transition disabled:opacity-50 font-medium flex items-center gap-2">
                            {generatingImage ? (
                              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Génération...</>
                            ) : 'Générer avec IA'}
                          </button>
                          <button onClick={() => handleSearchUnsplash(1)} disabled={generatingImage || searchingUnsplash}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 transition disabled:opacity-50 font-medium flex items-center gap-2">
                            {searchingUnsplash ? (
                              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Recherche...</>
                            ) : 'Photos Unsplash'}
                          </button>
                        </div>

                        {/* AI generated image */}
                        {generatedImageUrl && (
                          <div className="mt-3">
                            <p className="text-xs text-slate-600 mb-1">Cliquez sur l&apos;image pour la sélectionner</p>
                            <div
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition ${selectedPhotoUrl === generatedImageUrl ? 'border-brand-800' : 'border-transparent'}`}
                              onClick={() => setSelectedPhotoUrl(prev => prev === generatedImageUrl ? null : generatedImageUrl)}>
                              <img src={generatedImageUrl} alt="Image générée" className="w-full rounded-lg" />
                              {selectedPhotoUrl === generatedImageUrl && (
                                <div className="absolute top-2 right-2 bg-brand-800 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">✓</div>
                              )}
                            </div>
                            <button onClick={() => setLightboxUrl(generatedImageUrl)} className="mt-1 text-xs text-slate-600 hover:underline">
                              Voir en grand
                            </button>
                            {' · '}
                            <a href={generatedImageUrl} download="levad-post.png" target="_blank" rel="noopener noreferrer"
                              className="text-xs text-slate-600 hover:underline">
                              Télécharger
                            </a>
                          </div>
                        )}

                        {/* Unsplash photos */}
                        {unsplashPhotos.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-slate-600">Cliquez pour sélectionner · double-clic pour agrandir</p>
                              <button onClick={() => handleSearchUnsplash(unsplashPage + 1)} disabled={searchingUnsplash}
                                className="text-xs text-slate-600 hover:underline disabled:opacity-50">
                                {searchingUnsplash ? 'Chargement...' : 'Autres photos'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {unsplashPhotos.map(photo => (
                                <div key={photo.id} className="relative">
                                  <div
                                    className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition ${selectedPhotoUrl === photo.url ? 'border-brand-800' : 'border-transparent'}`}
                                    onClick={() => setSelectedPhotoUrl(prev => prev === photo.url ? null : photo.url)}
                                    onDoubleClick={() => setLightboxUrl(photo.url)}>
                                    <img src={photo.url} alt={photo.alt} className="w-full h-32 object-cover hover:opacity-90 transition" />
                                    {selectedPhotoUrl === photo.url && (
                                      <div className="absolute top-1 right-1 bg-brand-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✓</div>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5 truncate">Photo : {photo.author}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedPhotoUrl && (
                          <div className="mt-3 p-2 bg-slate-100 rounded-md flex items-center gap-2">
                            <img src={selectedPhotoUrl} alt="Sélectionnée" className="w-10 h-10 object-cover rounded" />
                            <p className="text-xs text-slate-600 font-medium flex-1">Image sélectionnée pour la prévisualisation</p>
                            <button onClick={() => setSelectedPhotoUrl(null)} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full min-h-96 flex items-center justify-center">
                  <div className="text-center p-8 max-w-sm">
                    <svg className="mx-auto mb-4 h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" />
                    </svg>
                    {drafts.length > 0 ? (
                      <>
                        <p className="font-medium text-slate-800">{drafts.length} post{drafts.length > 1 ? 's' : ''} en attente de validation</p>
                        <p className="text-sm text-slate-500 mt-1">Cliquez sur un post dans la liste pour le lire et le publier</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-slate-800">Prêt à créer votre prochain post ?</p>
                        <p className="text-sm text-slate-500 mt-1">Entrez un sujet à gauche et laissez Claude AI rédiger</p>
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
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Entreprise</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                <input value={config.companyName} onChange={e => setConfig({ ...config, companyName: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={config.companyDesc} onChange={e => setConfig({ ...config, companyDesc: e.target.value })}
                  rows={3} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ton</label>
                  <select value={config.tone} onChange={e => setConfig({ ...config, tone: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800">
                    <option value="professionnel">Professionnel</option>
                    <option value="expert">Expert</option>
                    <option value="accessible">Accessible</option>
                    <option value="enthousiaste">Enthousiaste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Audience cible</label>
                  <input value={config.targetAudience} onChange={e => setConfig({ ...config, targetAudience: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sujets <span className="text-slate-500 font-normal">(séparés par des virgules)</span></label>
                <textarea value={config.topics} onChange={e => setConfig({ ...config, topics: e.target.value })}
                  rows={Math.max(4, Math.ceil(config.topics.length / 70) + 1)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800" />
                <p className="text-xs text-slate-500 mt-1">{config.topics.split(',').filter(t => t.trim()).length} sujets</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email de notification</label>
                <input value={config.notifyEmail} onChange={e => setConfig({ ...config, notifyEmail: e.target.value })}
                  type="email" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800" />
                <p className="text-xs text-slate-500 mt-1">Reçoit un email dès qu&apos;un post est prêt à valider</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Mon histoire (posts en mon nom)</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Écrivez ici, avec vos mots, la matière vraie : votre parcours, pourquoi vous avez choisi ce métier
                  (impression, téléphonie, informatique, GED), ce qui vous anime, vos convictions, des épisodes marquants, des rencontres.
                  Claude écrit à la première personne <strong>uniquement</strong> à partir de ce texte et n&apos;invente rien.
                  Plus il est précis, plus les posts sonnent juste. Vous relisez toujours avant de valider.
                </p>
              </div>
              <textarea value={persona.bio} onChange={e => setPersona({ ...persona, bio: e.target.value })}
                rows={Math.max(8, Math.ceil(persona.bio.length / 70) + 2)} maxLength={8000}
                placeholder="Ex. : J'ai commencé en… Ce qui m'a fait choisir la téléphonie, c'est… Un client m'a dit un jour… Ce qui m'anime, c'est…"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800" />
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <label className="text-sm text-slate-700 flex items-center gap-2">
                  Un post en mon nom tous les
                  <input type="number" min={0} max={20} value={persona.rhythm}
                    onChange={e => setPersona({ ...persona, rhythm: parseInt(e.target.value || '0', 10) })}
                    className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center" />
                  posts <span className="text-xs text-slate-500">(0 = jamais automatiquement)</span>
                </label>
                <button onClick={handleSavePersona} disabled={savingPersona}
                  className="px-4 py-2 bg-brand-800 text-white rounded-md text-sm font-medium hover:bg-brand-900 transition disabled:opacity-50">
                  {savingPersona ? 'Sauvegarde...' : 'Sauvegarder mon histoire'}
                </button>
              </div>
              <p className="text-xs text-slate-500">{persona.bio.length} / 8000 caractères</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Réseaux actifs</h2>
              {[
                { key: 'linkedinEnabled', label: 'LinkedIn', vars: 'LINKEDIN_ACCESS_TOKEN' },
                { key: 'instagramEnabled', label: 'Instagram', vars: 'INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_ACCOUNT_ID' },
              ].map(({ key, label, vars }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-slate-200 rounded-md">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{vars}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={config[key as keyof Config] as boolean}
                      onChange={e => setConfig({ ...config, [key]: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-brand-800/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-800"></div>
                  </label>
                </div>
              ))}
            </div>

            <button onClick={handleSaveConfig} disabled={savingConfig}
              className="w-full bg-brand-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-brand-900 transition disabled:opacity-50">
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
