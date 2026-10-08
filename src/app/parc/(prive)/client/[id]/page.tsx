import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { appliquerSeuilsClient, envoyerLien, genererLien, majClient, regenererLien, renommerClient } from '../../actions'
import { statutConnexion, urlLien } from '@/lib/connect/agent'
import { Badge, formaterDate, depuis } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR } from '@/lib/connect/alertes'
import { VERT } from '@/components/connect/affichage'

export const dynamic = 'force-dynamic'

export default async function ClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.connectClient.findUnique({
    where: { id: Number(params.id) },
    include: { machines: true, postes: { orderBy: { derniereConnexion: 'desc' } } },
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
      <section className="mt-6 max-w-3xl rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Programme résident (relevé automatique)</h2>
        {client.codeLien ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Lien personnel d&apos;installation de ce client (permanent, valable pour tous ses ordinateurs) :
            </p>
            <p className="mt-1 break-all rounded-lg bg-gray-50 p-3 font-mono text-sm">{urlLien(client.codeLien)}</p>
            <form action={envoyerLien} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={client.id} />
              <label className="grow text-sm font-medium text-gray-700">
                Envoyer ce lien par mail à
                <input type="email" name="email" defaultValue={client.email ?? ''} placeholder="adresse du client" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <button className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
                Envoyer le lien
              </button>
            </form>
            <form action={regenererLien} className="mt-3">
              <input type="hidden" name="id" value={client.id} />
              <button className="text-sm text-red-600 underline">Régénérer le lien (l&apos;ancien cesse de fonctionner)</button>
            </form>
          </>
        ) : (
          <form action={genererLien} className="mt-3">
            <input type="hidden" name="id" value={client.id} />
            <button className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
              Créer le lien d&apos;installation
            </button>
          </form>
        )}

        <form action={majClient} className="mt-6 grid gap-4 border-t pt-4 md:grid-cols-3">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="email" value={client.email ?? ''} />
          <label className="text-sm font-medium text-gray-700">
            Mode de relevé
            <select name="modeReleve" defaultValue={client.modeReleve} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="agent">Programme résident</option>
              <option value="manuel">Relevés manuels (reçus par mail)</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Alerte de déconnexion après (jours)
            <input type="number" name="seuilDeconnexionJours" min={1} max={90} defaultValue={client.seuilDeconnexionJours} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <div className="flex items-end">
            <button className="rounded-lg border border-gray-300 px-4 py-2 font-semibold">Enregistrer</button>
          </div>
        </form>

        <h3 className="mt-6 font-semibold">Ordinateurs où le programme est installé</h3>
        {client.postes.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">Aucun pour l&apos;instant.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {client.postes.map((p) => (
              <li key={p.id}>
                <strong>{p.nom}</strong> <span className="text-gray-500">({p.systeme ?? 'système inconnu'})</span> — installé le{' '}
                {formaterDate(p.premiereConnexion)}, dernier signal {depuis(p.derniereConnexion)}{' '}
                {statutConnexion(p.derniereConnexion, client.seuilDeconnexionJours) === 'connecte' && <Badge ton="vert">connecté</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>

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
