import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { MAX_PLAYERS } from '@/lib/scoring'
import { AdminPlayerRow } from '@/components/pronostics/admin/AdminPlayerRow'

export default async function AdminPlayersPage() {
  const [players, session] = await Promise.all([
    prisma.player.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    }),
    getSession(),
  ])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Joueurs</h1>
        <span className="text-sm text-pitch-400">
          {players.length} / {MAX_PLAYERS}
        </span>
      </div>

      <div className="bg-pitch-900 border border-pitch-800 rounded-xl divide-y divide-pitch-800">
        {players.map((player) => (
          <AdminPlayerRow key={player.id} player={player} isSelf={player.id === session?.playerId} />
        ))}
      </div>
    </div>
  )
}
