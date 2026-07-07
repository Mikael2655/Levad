import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getLeaderboard } from '@/lib/scoring'
import { getCompetitionSession } from '@/lib/auth'
import { FavoriteStar } from '@/components/pronostics/FavoriteStar'
import { Avatar } from '@/components/pronostics/Avatar'

export default async function ClassementPage({
  params,
  searchParams,
}: {
  params: { competitionId: string }
  searchParams: { favoris?: string }
}) {
  const competitionId = Number(params.competitionId)
  const showFavoritesOnly = searchParams.favoris === '1'
  const session = await getCompetitionSession(competitionId)

  const favoriteRows = session
    ? await prisma.favorite.findMany({ where: { playerId: session.playerId }, select: { favoritePlayerId: true } })
    : []
  const favoriteIds = new Set(favoriteRows.map((f) => f.favoritePlayerId))

  const leaderboard = showFavoritesOnly
    ? await getLeaderboard(competitionId, [session!.playerId, ...favoriteIds])
    : await getLeaderboard(competitionId)

  const base = `/pronostics/${competitionId}/classement`
  const tabClass = (active: boolean) =>
    `text-sm font-medium px-3 py-2 rounded-lg transition ${
      active ? 'bg-gold-500 text-white' : 'bg-pitch-900 text-pitch-200 hover:bg-pitch-800'
    }`

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Classement</h1>
        <div className="flex gap-2">
          <Link href={base} className={tabClass(!showFavoritesOnly)}>
            Général
          </Link>
          <Link href={`${base}?favoris=1`} className={tabClass(showFavoritesOnly)}>
            ★ Mes favoris
          </Link>
        </div>
      </div>

      {showFavoritesOnly && leaderboard.length <= 1 && (
        <p className="text-sm text-pitch-400 mb-4">
          Tu n'as pas encore ajouté de favoris : clique sur l'étoile ☆ à côté d'un joueur dans le classement général.
        </p>
      )}

      <div className="bg-pitch-900 border border-pitch-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2.5rem_1.5rem_1fr_3.5rem] sm:grid-cols-[2.5rem_1.5rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 px-4 py-3 text-xs uppercase tracking-wide text-pitch-400 border-b border-pitch-800">
          <span>Rang</span>
          <span></span>
          <span>Joueur</span>
          <span className="text-right hidden sm:block">Matchs</span>
          <span className="text-right hidden sm:block">Bonus</span>
          <span className="text-right">Total</span>
        </div>
        <div className="divide-y divide-pitch-800">
          {leaderboard.map((row) => (
            <div
              key={row.id}
              className={`grid grid-cols-[2.5rem_1.5rem_1fr_3.5rem] sm:grid-cols-[2.5rem_1.5rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 px-4 py-3 items-center ${
                row.id === session?.playerId ? 'bg-gold-500/10' : ''
              }`}
            >
              <span className="font-bold text-pitch-300">
                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
              </span>
              <span>
                {session && row.id !== session.playerId && (
                  <FavoriteStar
                    competitionId={competitionId}
                    playerId={row.id}
                    initialIsFavorite={favoriteIds.has(row.id)}
                  />
                )}
              </span>
              <Link
                href={`/pronostics/${competitionId}/joueur/${row.id}`}
                className="flex items-center gap-2 min-w-0 hover:underline"
              >
                <Avatar name={row.name} avatarUrl={row.avatarUrl} size={28} />
                <span className={`truncate ${row.id === session?.playerId ? 'font-bold text-gold-500' : ''}`}>
                  {row.name}
                </span>
              </Link>
              <span className="text-right text-pitch-300 hidden sm:block">{row.matchPoints}</span>
              <span className="text-right text-pitch-300 hidden sm:block">{row.bonusPoints}</span>
              <span className="text-right font-bold">{row.totalPoints}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
