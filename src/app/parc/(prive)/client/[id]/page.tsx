import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { appliquerSeuilsClient, renommerClient } from '../../actions'
import { COULEURS, NOM_COULEUR } from '@/lib/connect/alertes'
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
      <form action={appliquerSeuilsClient} className="mt-6 max-w-2xl space-y-3 rounded-xl border bg-white p-6">
        <input type="hidden" name="id" value={client.id} />
        <h2 className="font-bold">Seuils d&apos;alerte de toutes les machines de ce client (%)</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {COULEURS.map((c) => (
            <label key={c} className="text-sm text-gray-600">
              {NOM_COULEUR[c]}
              <input type="number" name={`seuil${NOM_COULEUR[c]}`} min={0} max={100} defaultValue={25} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
          ))}
        </div>
        <button className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
          Appliquer à toutes ses machines
        </button>
        <p className="text-xs text-gray-500">Pour régler une seule machine, ouvrez sa fiche.</p>
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
