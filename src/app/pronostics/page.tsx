import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function PronosticsHubPage() {
  const session = await getSession()
  if (session) {
    const player = await prisma.player.findUnique({ where: { id: session.playerId } })
    if (player && player.competitionId === session.competitionId) {
      redirect(`/pronostics/${session.competitionId}`)
    }
  }

  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, _count: { select: { players: true } } },
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="text-4xl mb-2">⚽</div>
        <h1 className="text-4xl font-black tracking-tight mb-3">
          Pronos<span className="text-gold-400">Foot</span>
        </h1>
        <p className="text-pitch-200 max-w-xl mx-auto">
          Rejoins une compétition de pronostics entre amis avec son code d'accès, ou crée la tienne.
        </p>
        <Link
          href="/pronostics/creer"
          className="inline-block mt-6 bg-gold-500 hover:bg-gold-400 text-pitch-950 font-bold px-6 py-3 rounded-xl transition"
        >
          Créer une compétition
        </Link>
      </div>

      <h2 className="text-lg font-bold mb-4">Compétitions existantes</h2>
      {competitions.length === 0 ? (
        <p className="text-pitch-400 text-sm">Aucune compétition créée pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {competitions.map((c) => (
            <div
              key={c.id}
              className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-pitch-400">{c._count.players} / 300 joueurs</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/pronostics/${c.id}/register`}
                  className="bg-gold-500 hover:bg-gold-400 text-pitch-950 font-semibold text-sm px-3 py-2 rounded-lg transition"
                >
                  Rejoindre
                </Link>
                <Link
                  href={`/pronostics/${c.id}/login`}
                  className="bg-pitch-800 hover:bg-pitch-700 text-sm px-3 py-2 rounded-lg transition"
                >
                  Connexion
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
