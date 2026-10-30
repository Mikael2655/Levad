import { libelleMachine } from '@/lib/connect/libelle'
import { prisma } from '@/lib/db'
import { trierParNom } from '@/lib/connect/tri'
import { Bouton } from '@/components/connect/Formulaire'
import { SelectionExport } from '@/components/connect/SelectionExport'
import { VERT, nombre } from '@/components/connect/affichage'
import { calculerExport, lireParams } from '@/lib/connect/export'

export const dynamic = 'force-dynamic'

const jourFr = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })

export default async function ExportsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const clientsDb = trierParNom(await prisma.connectClient.findMany({
    orderBy: { nom: 'asc' },
    include: { machines: { where: { horsContrat: false }, orderBy: [{ site: 'asc' }, { id: 'asc' }] } },
  }))
  const clients = clientsDb
    .filter((c) => c.machines.length > 0)
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      mois: c.moisFacturation,
      machines: c.machines.map((m) => ({ id: m.id, libelle: `${libelleMachine(m, 'Machine')} · n° ${m.numeroSerie ?? '—'}` })),
    }))

  const lu = lireParams(searchParams)
  const aujourdhui = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
  const un = (k: string) => (Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : (searchParams[k] as string | undefined))
  const lignes = lu ? await calculerExport({ ...lu.params, anciens: 'inclure' }) : null
  const anciennes = lignes?.filter((l) => l.ancien) ?? []
  const exclure = lu?.params.anciens === 'exclure'
  const affichees = lignes ? (exclure ? lignes.filter((l) => !l.ancien) : lignes) : null
  const lien = lu ? `/api/parc/export?${new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : []))).toString()}` : ''
  const champ = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2'

  return (
    <>
      <h1 className="text-2xl font-bold">Exports Excel</h1>
      <p className="mt-1 text-gray-600">
        Totaux (index) à une date choisie : pour chaque machine, le relevé le plus récent à cette date ou avant. Les machines hors contrat n&apos;apparaissent pas.
      </p>

      <form method="get" className="mt-6 space-y-6 rounded-xl border bg-white p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Date des totaux
            <input type="date" name="date" required defaultValue={lu?.params.date ?? aujourdhui} className={champ} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Comparer avec une date antérieure (facultatif)
            <input type="date" name="d2" defaultValue={lu?.params.date2 ?? ''} className={champ} />
            <span className="mt-1 block text-xs font-normal text-gray-500">Ajoute le total à cette date et le volume entre les deux dates.</span>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Alerte si le relevé a plus de (jours)
            <input type="number" name="j" min={1} max={365} defaultValue={lu?.params.seuilJours ?? 10} className={champ} />
          </label>
        </div>

        <SelectionExport clients={clients} clientsCoches={lu?.params.clients ?? []} machinesCochees={lu?.params.machines ?? []} />

        <div className="flex flex-wrap gap-6 text-sm text-gray-700">
          <label className="flex items-center gap-2"><input type="checkbox" name="scans" value="1" defaultChecked={lu?.options.scans} className="h-4 w-4" /> Ajouter les scans (501)</label>
          <label className="flex items-center gap-2">
            Relevés trop anciens :
            <select name="anc" defaultValue={lu?.params.anciens ?? 'inclure'} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5">
              <option value="inclure">les inclure</option>
              <option value="exclure">les exclure</option>
            </select>
          </label>
        </div>
        <Bouton className="rounded-lg px-5 py-2.5 font-semibold text-white" style={{ backgroundColor: VERT }}>Afficher l&apos;aperçu</Bouton>
      </form>

      {lu && lignes && affichees && (
        <section className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Aperçu au {jourFr(new Date(lu.params.date + 'T12:00:00Z'))}</h2>
          {lu.params.clients.length === 0 && <p className="mt-2 text-gray-600">Cochez au moins un client.</p>}
          {anciennes.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>{anciennes.length} machine{anciennes.length > 1 ? 's' : ''} sans relevé récent</strong> (plus de {lu.params.seuilJours} jours avant la date choisie) :
              <ul className="mt-1 list-disc pl-5">
                {anciennes.map((l) => (
                  <li key={l.machineId}>
                    {l.client} — {l.reference} : {l.dateReleve ? `dernier relevé le ${jourFr(l.dateReleve)}` : 'aucun relevé à cette date'}
                  </li>
                ))}
              </ul>
              <p className="mt-1">Réglage actuel : {exclure ? 'ces machines sont exclues de l’export.' : 'ces machines sont incluses dans l’export.'} Vous pouvez le changer ci-dessus.</p>
            </div>
          )}
          {affichees.length > 0 && (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Référence</th>
                      <th className="py-2 pr-4">N° de série</th>
                      <th className="py-2 pr-4 text-right">Total N&amp;B</th>
                      <th className="py-2 pr-4 text-right">Total couleur</th>
                      {lu.options.scans && <th className="py-2 pr-4 text-right">Scans</th>}
                      <th className="py-2 pr-4">Relevé du</th>
                      {lu.params.date2 && <th className="py-2 pr-4 text-right">Volume N&amp;B</th>}
                      {lu.params.date2 && <th className="py-2 text-right">Volume couleur</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {affichees.map((l) => (
                      <tr key={l.machineId} className={`border-b last:border-0 ${l.ancien ? 'bg-amber-50' : ''}`}>
                        <td className="py-1.5 pr-4">{l.client}</td>
                        <td className="py-1.5 pr-4">{l.reference}</td>
                        <td className="py-1.5 pr-4">{l.serie}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">{nombre(l.nb)}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">{nombre(l.couleur)}</td>
                        {lu.options.scans && <td className="py-1.5 pr-4 text-right tabular-nums">{nombre(l.scans)}</td>}
                        <td className="py-1.5 pr-4">{l.dateReleve ? jourFr(l.dateReleve) : '—'}</td>
                        {lu.params.date2 && <td className="py-1.5 pr-4 text-right tabular-nums">{l.nb !== null && l.nb2 !== null ? nombre(l.nb - l.nb2) : '—'}</td>}
                        {lu.params.date2 && <td className="py-1.5 text-right tabular-nums">{l.couleur !== null && l.couleur2 !== null ? nombre(l.couleur - l.couleur2) : '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a href={lien} className="mt-4 inline-block rounded-lg px-5 py-2.5 font-semibold text-white" style={{ backgroundColor: VERT }}>
                Télécharger l&apos;Excel ({affichees.length} ligne{affichees.length > 1 ? 's' : ''})
              </a>
            </>
          )}
          {lu.params.clients.length > 0 && affichees.length === 0 && <p className="mt-2 text-gray-600">Aucune machine à exporter avec ces réglages.</p>}
        </section>
      )}
    </>
  )
}
