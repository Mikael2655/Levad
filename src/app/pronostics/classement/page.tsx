import { getLeaderboard } from '@/lib/scoring'
import { getSession } from '@/lib/auth'

export default async function ClassementPage() {
  const [leaderboard, session] = await Promise.all([getLeaderboard(), getSession()])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Classement général</h1>

      <div className="bg-pitch-900 border border-pitch-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-3 text-xs uppercase tracking-wide text-pitch-400 border-b border-pitch-800">
          <span>Rang</span>
          <span>Joueur</span>
          <span className="text-right">Matchs</span>
          <span className="text-right">Bonus</span>
          <span className="text-right">Total</span>
        </div>
        <div className="divide-y divide-pitch-800">
          {leaderboard.map((row) => (
            <div
              key={row.id}
              className={`grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-3 items-center ${
                row.id === session?.playerId ? 'bg-pitch-800/60' : ''
              }`}
            >
              <span className="font-bold text-pitch-300">
                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
              </span>
              <span className={row.id === session?.playerId ? 'font-bold text-gold-400' : ''}>{row.name}</span>
              <span className="text-right text-pitch-300">{row.matchPoints}</span>
              <span className="text-right text-pitch-300">{row.bonusPoints}</span>
              <span className="text-right font-bold">{row.totalPoints}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
