import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { renommerClient } from '../../actions'
import { VERT } from '@/components/connect/affichage'

export const dynamic = 'force-dynamic'

export default async function ClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.connectClient.findUnique({
    where: { id: Number(params.id) },
    include: { machines: true },
  })
  if (!client) notFound()
  return (
    <>
      <Link href="/parc" className="text-sm text-gray-500 hover:text-gray-900">← Retour au parc</Link>
      <h1 className="mt-3 text-2xl font-bold">{client.nom}</h1>
      <form action={renommerClient} className="mt-6 max-w-md space-y-3 rounded-xl border bg-white p-6">
        <input type="hidden" name="id" value={client.id} />
        <label className="block text-sm font-medium text-gray-700">
          Nom affiché (raison sociale, nom commercial…)
          <input name="nom" defaultValue={client.nom} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <button className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
          Enregistrer
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-500">
        Les relevés futurs de ce client continueront d&apos;être reconnus même si vous changez le nom affiché. Pour
        regrouper deux noms qui désignent la même société, ouvrez une machine et changez son « Client ».
      </p>
      <h2 className="mt-8 text-lg font-bold">Machines</h2>
      <ul className="mt-2 list-disc pl-6 text-gray-700">
        {client.machines.map((m) => (
          <li key={m.id}>
            <Link href={`/parc/machine/${m.id}`} className="underline">
              {m.nomAffiche || m.modele || 'Machine inconnue'}
            </Link>{' '}
            — n° {m.numeroSerie ?? '—'}
          </li>
        ))}
      </ul>
    </>
  )
}
