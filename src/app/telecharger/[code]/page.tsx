import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { MOTIF_CODE } from '@/lib/connect/agent'
import { PageTelechargement } from '@/components/connect/PageTelechargement'

// Page personnelle d'un client : son lien d'installation permanent (lié à son compte, pas à un PC).

export const metadata: Metadata = {
  title: 'Levad Connect — Installer',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.png' },
}
export const dynamic = 'force-dynamic'

export default async function LienPersonnel({ params }: { params: { code: string } }) {
  if (!MOTIF_CODE.test(params.code)) notFound()
  let client
  try {
    client = await prisma.connectClient.findUnique({ where: { codeLien: params.code }, select: { nom: true } })
  } catch {
    notFound()
  }
  if (!client) notFound()
  return (
    <PageTelechargement
      resident
      nomClient={client.nom}
      lienWindows={`/telecharger/${params.code}/windows`}
    />
  )
}
