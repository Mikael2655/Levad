'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface Player {
  id: number
  name: string
  role: string
}

export function PronosticsNav({ player }: { player: Player | null }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/pronostics/auth/logout', { method: 'POST' })
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
        <Link href="/pronostics" className="flex items-center gap-2 font-black text-lg tracking-tight">
          <span className="text-2xl">⚽</span>
          <span>Pronos<span className="text-gold-400">Foot</span></span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          {player && (
            <>
              <Link href="/pronostics/dashboard" className={linkClass('/pronostics/dashboard')}>
                Mes pronostics
              </Link>
              <Link href="/pronostics/classement" className={linkClass('/pronostics/classement')}>
                Classement
              </Link>
              {player.role === 'ADMIN' && (
                <Link href="/pronostics/admin" className={linkClass('/pronostics/admin')}>
                  Administration
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
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
              <Link href="/pronostics/login" className="text-sm font-medium text-pitch-100 hover:text-white transition">
                Connexion
              </Link>
              <Link
                href="/pronostics/register"
                className="text-sm font-semibold bg-gold-500 hover:bg-gold-400 text-pitch-950 px-3 py-2 rounded-lg transition"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>

      {player && (
        <nav className="sm:hidden flex items-center gap-1 px-6 pb-3 overflow-x-auto">
          <Link href="/pronostics/dashboard" className={linkClass('/pronostics/dashboard')}>
            Pronostics
          </Link>
          <Link href="/pronostics/classement" className={linkClass('/pronostics/classement')}>
            Classement
          </Link>
          {player.role === 'ADMIN' && (
            <Link href="/pronostics/admin" className={linkClass('/pronostics/admin')}>
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
