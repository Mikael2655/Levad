'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Barre latérale de l'outil : logo, menu (page en cours en surbrillance), profil. Sur téléphone, elle se replie derrière un bouton.
const ICONES = {
  nouvelle: 'M12 5v14M5 12h14',
  accueil: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z',
  demandes: 'M9 12h6M9 16h6M9 8h6M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
  contrats: 'M4 7h16M4 12h16M4 17h10',
  admin: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.6-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  fermer: 'M6 6l12 12M18 6 6 18',
  chevron: 'm6 9 6 6 6-6',
}
const Icone = ({ d, className = 'w-[18px] h-[18px]' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d={d} /></svg>
)

interface Entree { href: string; libelle: string; icone: string; actif: (chemin: string) => boolean }

export default function BarreLaterale(p: { prenom: string; nom: string; email: string; role: string; admin: boolean; menuVisible: boolean }) {
  const chemin = usePathname()
  const [ouvert, setOuvert] = useState(false) // tiroir mobile
  const [profil, setProfil] = useState(false)
  const refProfil = useRef<HTMLDivElement>(null)

  useEffect(() => setOuvert(false), [chemin]) // le tiroir se referme quand on change de page
  useEffect(() => {
    if (!profil) return
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !refProfil.current?.contains(e.target as Node)) setProfil(false)
    }
    document.addEventListener('mousedown', fermer)
    document.addEventListener('keydown', fermer)
    return () => { document.removeEventListener('mousedown', fermer); document.removeEventListener('keydown', fermer) }
  }, [profil])

  const entrees: Entree[] = [
    { href: '/financement/accueil', libelle: 'Accueil', icone: ICONES.accueil, actif: c => c.startsWith('/financement/accueil') },
    { href: '/financement', libelle: 'Demandes en cours', icone: ICONES.demandes, actif: c => c === '/financement' || (c.startsWith('/financement/demandes') && !c.startsWith('/financement/demandes/nouvelle')) },
    { href: '/financement/demandes/nouvelle', libelle: 'Nouvelle demande', icone: ICONES.nouvelle, actif: c => c.startsWith('/financement/demandes/nouvelle') },
    { href: '/financement/contrats', libelle: 'Contrats', icone: ICONES.contrats, actif: c => c.startsWith('/financement/contrats') },
    ...(p.admin ? [{ href: '/financement/admin', libelle: 'Administration', icone: ICONES.admin, actif: (c: string) => c.startsWith('/financement/admin') }] : []),
  ]
  const initiales = ((p.prenom[0] ?? '') + (p.nom[0] ?? '')).toUpperCase()

  const contenu = (
    <>
      <div className="h-16 px-6 flex items-center border-b border-gray-100 shrink-0">
        <Link href="/financement/accueil" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/levad-logo.png" alt="LEVAD" className="h-8 w-auto" />
          <span className="ml-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Leasing</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {p.menuVisible && (
          <>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu</p>
            {entrees.map(e => {
              const actif = e.actif(chemin)
              return (
                <Link key={e.href} href={e.href} aria-current={actif ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${actif ? 'bg-leasing-50 text-leasing-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <Icone d={e.icone} className={`w-[18px] h-[18px] ${actif ? 'text-leasing-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {e.libelle}
                </Link>
              )
            })}
          </>
        )}
      </nav>
      <div className="p-3 border-t border-gray-100 shrink-0 relative" ref={refProfil}>
        {profil && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-lg border border-gray-200 shadow-lg py-1.5 text-sm z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="font-medium text-gray-900">{p.prenom} {p.nom}</p>
              <p className="text-xs text-gray-500 break-all">{p.email}</p>
            </div>
            <Link href="/financement/mot-de-passe" className="block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50" onClick={() => setProfil(false)}>Changer mon mot de passe</Link>
            <button className="block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50" onClick={async () => {
              await fetch('/api/financement/deconnexion', { method: 'POST' })
              window.location.href = '/financement/connexion'
            }}>Déconnexion</button>
          </div>
        )}
        <button className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-gray-50 text-left" aria-expanded={profil} onClick={() => setProfil(!profil)}>
          <span className="w-9 h-9 rounded-full bg-leasing-100 text-leasing-800 text-sm font-semibold flex items-center justify-center shrink-0">{initiales}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-gray-900 truncate">{p.prenom} {p.nom[0] ? `${p.nom[0]}.` : ''}</span>
            <span className="block text-xs text-gray-500">{p.role}</span>
          </span>
          <Icone d={ICONES.chevron} className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ordinateur : barre fixe à gauche */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex-col z-30">{contenu}</aside>
      {/* téléphone : barre du haut + tiroir */}
      <div className="md:hidden sticky top-0 z-30 h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        <Link href="/financement/accueil" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/levad-logo.png" alt="LEVAD" className="h-7 w-auto" />
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Leasing</span>
        </Link>
        <button aria-label="Ouvrir le menu" className="p-2 -mr-2 text-gray-600" onClick={() => setOuvert(true)}><Icone d={ICONES.menu} className="w-6 h-6" /></button>
      </div>
      {ouvert && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setOuvert(false)} />
          <aside className="relative w-72 max-w-[85%] bg-white flex flex-col shadow-xl">
            <button aria-label="Fermer le menu" className="absolute top-4 right-3 p-1 text-gray-400" onClick={() => setOuvert(false)}><Icone d={ICONES.fermer} className="w-5 h-5" /></button>
            {contenu}
          </aside>
        </div>
      )}
    </>
  )
}
