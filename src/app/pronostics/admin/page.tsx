import Link from 'next/link'
import { prisma } from '@/lib/db'
import { MAX_PLAYERS } from '@/lib/scoring'

export default async function AdminHomePage() {
  const [playerCount, matchCount, finishedCount, bonusCount] = await Promise.all([
    prisma.player.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: 'FINISHED' } }),
    prisma.bonusQuestion.count(),
  ])

  const cards = [
    { label: 'Joueurs inscrits', value: `${playerCount} / ${MAX_PLAYERS}`, href: '/pronostics/admin/joueurs' },
    { label: 'Matchs', value: `${finishedCount} / ${matchCount} terminés`, href: '/pronostics/admin/matches' },
    { label: 'Questions bonus', value: bonusCount, href: '/pronostics/admin/bonus' },
    { label: 'Barème de points', value: 'Configurer →', href: '/pronostics/admin/bareme' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Administration</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-pitch-900 border border-pitch-800 rounded-xl p-6 hover:border-gold-500 transition"
          >
            <div className="text-sm text-pitch-400 uppercase tracking-wide mb-2">{card.label}</div>
            <div className="text-2xl font-black">{card.value}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
