'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Avatar } from '@/components/pronostics/Avatar'

interface Player {
  id: number
  name: string
  role: string
  avatarUrl?: string | null
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
      pathname === href ? 'bg-gold-500 text-white' : 'text-pitch-100 hover:bg-pitch-800'
    }`

  // Ordre demandé : Classement, Pronostics, Résultats, Profil.
  const menu = player
    ? [
        { href: `${base}/classement`, label: 'Classement' },
        { href: `${base}/dashboard`, label: 'Pronostics' },
        { href: `${base}/resultats`, label: 'Résultats' },
        { href: `${base}/profil`, label: 'Profil' },
        ...(player.role === 'ADMIN' ? [{ href: `${base}/admin`, label: 'Administration' }] : []),
      ]
    : []

  return (
    <header className="bg-pitch-900/90 backdrop-blur border-b border-pitch-800 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href={base} className="flex items-center gap-2 font-black text-lg tracking-tight min-w-0">
          <span className="text-2xl shrink-0">⚽</span>
          <span className="truncate">{competitionName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {menu.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {player ? (
            <>
              <Link href={`${base}/profil`} className="hidden sm:flex items-center gap-2 hover:opacity-80 transition">
                <Avatar name={player.name} avatarUrl={player.avatarUrl} size={30} />
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold bg-pitch-800 hover:bg-pitch-700 px-3 py-2 rounded-lg transition"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href={`${base}/login`} className="text-sm font-medium text-pitch-100 hover:text-gray-900 transition">
                Connexion
              </Link>
              <Link
                href={`${base}/register`}
                className="text-sm font-semibold bg-gold-500 hover:bg-gold-400 text-white px-3 py-2 rounded-lg transition"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>

      {player && (
        <nav className="md:hidden flex items-center gap-1 px-6 pb-3 overflow-x-auto">
          {menu.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
