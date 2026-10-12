import { libelleMachine } from '@/lib/connect/libelle'
import { prisma } from '@/lib/db'
import { ImportReleves } from '@/components/connect/ImportReleves'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const clients = await prisma.connectClient.findMany({
    orderBy: { nom: 'asc' },
    include: { machines: { orderBy: [{ site: 'asc' }, { id: 'asc' }] } },
  })
  return (
    <>
      <h1 className="text-2xl font-bold">Import de relevés</h1>
      <p className="mt-1 text-gray-600">
        Pour les clients qui envoient leur relevé par mail : déposez le PDF (une page par machine) ou la photo de l&apos;écran. L&apos;IA lit les compteurs, vous vérifiez, puis vous validez.
      </p>
      <div className="mt-6">
        <ImportReleves
          clients={clients.map((c) => ({
            id: c.id,
            nom: c.nom,
            machines: c.machines.map((m) => ({ id: m.id, libelle: `${libelleMachine(m, 'Machine')} · n° ${m.numeroSerie ?? '—'}${m.horsContrat ? ' (hors contrat)' : ''}` })),
          }))}
        />
      </div>
    </>
  )
}
