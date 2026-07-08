import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { ProfileForm } from '@/components/pronostics/ProfileForm'

export default async function ProfilPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: session!.playerId },
    select: { name: true, email: true, avatarUrl: true },
  })

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      <ProfileForm competitionId={competitionId} player={player} />
    </div>
  )
}
