import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PronosticsNav } from '@/components/pronostics/PronosticsNav'

export const metadata = {
  title: 'Pronostics Foot',
  description: 'Concours de pronostics de football entre amis : matchs, questions bonus et classement.',
}

export default async function PronosticsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const player = session
    ? await prisma.player.findUnique({
        where: { id: session.playerId },
        select: { id: true, name: true, role: true },
      })
    : null

  return (
    <div className="min-h-screen bg-pitch-950 text-white">
      <PronosticsNav player={player} />
      <main>{children}</main>
    </div>
  )
}
