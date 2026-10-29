import { libelleMachine } from '@/lib/connect/libelle'
import { prisma } from '@/lib/db'
import { trierParNom } from '@/lib/connect/tri'
import Link from 'next/link'
import { ImportReleves } from '@/components/connect/ImportReleves'
import { ImportCsv } from '@/components/connect/ImportCsv'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { calculer, type Compteurs } from '@/lib/connect/calcul'
import { jour, nombre } from '@/components/connect/affichage'
import { supprimerReleveImporte } from '../actions'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const clients = trierParNom(await prisma.connectClient.findMany({
    orderBy: { nom: 'asc' },
    include: { machines: { orderBy: [{ site: 'asc' }, { id: 'asc' }] } },
  }))
  const imports = await prisma.connectReleve.findMany({
    where: { source: 'import' },
    orderBy: { date: 'desc' },
    take: 100,
    include: { machine: { include: { client: { select: { id: true, nom: true } } } } },
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

      <ImportCsv clients={clients.map((c) => ({ id: c.id, nom: c.nom }))} />

      <section className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Derniers imports</h2>
        <p className="text-sm text-gray-500">Les 100 derniers relevés importés à la main (PDF ou photo), du plus récent au plus ancien.</p>
        {imports.length === 0 ? (
          <p className="mt-3 text-gray-600">Aucun import pour l&apos;instant.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Date du relevé</th>
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Machine</th>
                  <th className="py-2 pr-4 text-right">N&amp;B</th>
                  <th className="py-2 pr-4 text-right">Couleur</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {imports.map((r) => {
                  const calc = calculer((r.compteurs ?? {}) as unknown as Compteurs, r.machine.recette)
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap py-1.5 pr-4">{jour(r.date)}</td>
                      <td className="py-1.5 pr-4"><Link href={`/parc/client/${r.machine.client.id}`} className="underline">{r.machine.client.nom}</Link></td>
                      <td className="py-1.5 pr-4"><Link href={`/parc/machine/${r.machine.id}`} className="underline">{libelleMachine(r.machine, 'Machine')}</Link> <span className="text-gray-500">· n° {r.machine.numeroSerie ?? '—'}</span></td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">{calc.retenue ? nombre(calc.retenue.nb) : '—'}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">{calc.retenue ? nombre(calc.retenue.couleur) : '—'}</td>
                      <td className="py-1.5 text-right">
                        <Formulaire action={supprimerReleveImporte} message="Relevé supprimé" confirmation="Supprimer ce relevé importé ?">
                          <input type="hidden" name="id" value={r.id} />
                          <Bouton className="text-sm text-red-600 underline">Supprimer</Bouton>
                        </Formulaire>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
