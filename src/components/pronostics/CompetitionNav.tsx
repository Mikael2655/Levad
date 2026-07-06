'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface Player {
  id: number
  name: string
  role: string
}

export function CompetitionNav({
  competitionId,
  competitionName,
  player,
}: {
  competitionId: number
  competitionName: string
  player: Player | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const base = `/pronostics/${competitionId}`

  async function handleLogout() {
    await fetch(`/api/pronostics/${competitionId}/auth/logout`, { method: 'POST' })
    router.push('/pronostics')
    router.refresh()
  }

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      pathname === href ? 'bg-pitch-700 text-white' : 'text-pitch-100 hover:bg-pitch-800'
    }`

  return (
    <header className="bg-pitch-900/80 backdrop-blur border-b border-pitch-800 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href={base} className="flex items-center gap-2 font-black text-lg tracking-tight min-w-0">
          <span className="text-2xl shrink-0">⚽</span>
          <span className="truncate">{competitionName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {player && (
            <>
              <Link href={`${base}/dashboard`} className={linkClass(`${base}/dashboard`)}>
                Mes pronostics
              </Link>
              <Link href={`${base}/resultats`} className={linkClass(`${base}/resultats`)}>
                Résultats
              </Link>
              <Link href={`${base}/classement`} className={linkClass(`${base}/classement`)}>
                Classement
              </Link>
              {player.role === 'ADMIN' && (
                <Link href={`${base}/admin`} className={linkClass(`${base}/admin`)}>
                  Administration
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {player ? (
            <>
              <span className="hidden sm:inline text-sm text-pitch-200">Salut, {player.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold bg-pitch-800 hover:bg-pitch-700 px-3 py-2 rounded-lg transition"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href={`${base}/login`} className="text-sm font-medium text-pitch-100 hover:text-white transition">
                Connexion
              </Link>
              <Link
                href={`${base}/register`}
                className="text-sm font-semibold bg-gold-500 hover:bg-gold-400 text-pitch-950 px-3 py-2 rounded-lg transition"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>

      {player && (
        <nav className="md:hidden flex items-center gap-1 px-6 pb-3 overflow-x-auto">
          <Link href={`${base}/dashboard`} className={linkClass(`${base}/dashboard`)}>
            Pronostics
          </Link>
          <Link href={`${base}/resultats`} className={linkClass(`${base}/resultats`)}>
            Résultats
          </Link>
          <Link href={`${base}/classement`} className={linkClass(`${base}/classement`)}>
            Classement
          </Link>
          {player.role === 'ADMIN' && (
            <Link href={`${base}/admin`} className={linkClass(`${base}/admin`)}>
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
