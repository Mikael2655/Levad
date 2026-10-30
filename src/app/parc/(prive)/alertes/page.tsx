import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { changementsAVerifier } from '@/lib/connect/changements'
import { libelleMachine } from '@/lib/connect/libelle'
import { traiterChangement } from '../actions'
import { Badge, Encres, depuis, formaterDate } from '@/components/connect/affichage'
import { groupesParSite } from '@/lib/connect/libelle'
import { COULEURS, NOM_COULEUR, clientsEnAlerte, type ClientEtat, type MachineEtat } from '@/lib/connect/alertes'

export const dynamic = 'force-dynamic'

function LigneMachine({ m, client }: { m: MachineEtat; client: ClientEtat }) {
  const partage = client.machines.filter((x) => x.id !== m.id && x.groupe === m.groupe)
  const encres = m.couleurs.map((c) => ({ couleur: c.couleur, pourcent: c.pourcent }))
  const seuils = Object.fromEntries(m.couleurs.map((c) => [c.couleur, c.seuil]))
  const etats = Object.fromEntries(m.couleurs.map((c) => [c.couleur, { bas: c.bas, jours: c.jours, mode: c.mode, alerte: c.alerte, minimum: c.minimum }]))
  return (
    <Link href={`/parc/machine/${m.id}`} className="grid items-center gap-4 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1.2fr_2fr_1fr]">
      <div>
        <p className="font-semibold">{m.nom}</p>
        {partage.length > 0 && <p className="text-xs text-gray-500">Stock partagé avec {partage.map((x) => x.nom.split(' / ').pop()).join(' et ')}</p>}
        {m.enAlerte ? (
          <p className="mt-1 text-sm font-semibold text-red-600">
            {m.couleurs
              .filter((c) => c.alerte)
              .map((c) => `${NOM_COULEUR[c.couleur]} ${c.pourcent} %`)
              .join(' · ')}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">Pas d&apos;alerte sur cette machine</p>
        )}
      </div>
      <div>
        <Encres encres={encres} seuils={seuils} stock={m.stock} etats={etats} afficherStock />
      </div>
      <p className="text-sm text-gray-500 md:text-right" title={m.dernierReleve ? formaterDate(m.dernierReleve) : undefined}>
        {m.dernierReleve ? `Relevé ${depuis(m.dernierReleve)}` : 'Jamais lu'}
      </p>
    </Link>
  )
}

export default async function AlertesPage() {
  let clients: ClientEtat[]
  try {
    clients = await clientsEnAlerte()
  } catch {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">La base de données n&apos;est pas encore prête.</p>
  }
  const aVerifier = await changementsAVerifier().catch(() => [])
  const nbMachines = clients.reduce((n, c) => n + c.nbAlertes, 0)
  return (
    <>
      <h1 className="text-2xl font-bold">Alerte encre</h1>
      <p className="mt-1 text-gray-600">
        Un client est en alerte pour une couleur quand il lui reste <strong>moins de 10 jours d&apos;encre</strong> (estimés d&apos;après sa consommation récente) <strong>et</strong> qu&apos;il n&apos;a
        plus de cartouche de cette couleur en stock. Après un changement de cartouche, la consommation de la cartouche précédente est reprise. Faute d&apos;historique suffisant (machine récemment installée), c&apos;est le seuil en % de la machine qui s&apos;applique. Seules les machines Canon suivies par LEVAD sont concernées.
      </p>

      {aVerifier.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">Stock à vérifier ({aVerifier.length})</h2>
          <p className="mt-1 text-sm text-amber-900">
            Le niveau d&apos;encre de ces couleurs est brusquement remonté : une cartouche a été remplacée. Mais aucune cartouche n&apos;a été retirée du stock du client (il n&apos;y en avait pas de saisie à ce moment-là), alors qu&apos;il lui en reste aujourd&apos;hui. Si c&apos;est la cartouche du stock qui a été posée, répondez « Oui » pour la retirer ; sinon « Non » : la vérification est notée et l&apos;alerte disparaît.
          </p>
          <ul className="mt-3 divide-y divide-amber-200">
            {aVerifier.map((a) => (
              <li key={`${a.machineId}-${a.couleur}-${a.quand.getTime()}`} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <strong>{a.client}</strong> — {libelleMachine(a.machine, 'Machine')} : {NOM_COULEUR[a.couleur as keyof typeof NOM_COULEUR]} passé de {a.avant} % à {a.apres} % le {formaterDate(a.quand)} · stock actuel : {a.stock}
                </span>
                <span className="flex gap-2">
                  {(['oui', 'non'] as const).map((r) => (
                    <Formulaire key={r} action={traiterChangement} message={r === 'oui' ? 'Cartouche retirée du stock' : 'Noté'}>
                      <input type="hidden" name="machineId" value={a.machineId} />
                      <input type="hidden" name="couleur" value={a.couleur} />
                      <input type="hidden" name="quand" value={a.quand.toISOString()} />
                      <input type="hidden" name="avant" value={a.avant} />
                      <input type="hidden" name="apres" value={a.apres} />
                      <input type="hidden" name="reponse" value={r} />
                      <Bouton className="rounded-lg border border-amber-400 bg-white px-3 py-1 text-xs font-semibold">{r === 'oui' ? 'Oui, retirer 1 du stock' : 'Non, c’est correct'}</Bouton>
                    </Formulaire>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {clients.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-white p-10 text-center">
          <p className="text-lg font-semibold text-green-700">Aucun client en alerte</p>
          <p className="mt-1 text-gray-600">Tous les niveaux sont au-dessus du seuil, ou couverts par du stock.</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {clients.length} client{clients.length > 1 ? 's' : ''}, {nbMachines} machine{nbMachines > 1 ? 's' : ''} en alerte.
          </p>
          <div className="mt-6 space-y-8">
            {clients.map((c) => (
              <section key={c.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{c.nom}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Link href={`/parc/client/${c.id}#envoi`} className="rounded-lg bg-gray-900 px-3 py-1.5 font-semibold text-white">
                      Saisir un envoi
                    </Link>
                  </div>
                </div>
                {groupesParSite(c.machines).map(([site, lesMachines], gi) => (
                  <div key={site} className={gi > 0 ? 'mt-4' : ''}>
                    <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">{site}</h3>
                    <div className="divide-y rounded-xl border bg-white">
                      {[...lesMachines].sort((a, b) => Number(b.enAlerte) - Number(a.enAlerte)).map((m) => (
                        <LigneMachine key={m.id} m={m} client={c} />
                      ))}
                    </div>
                  </div>
                ))}
                {c.machines.some((m) => !m.enAlerte) && (
                  <p className="mt-2 text-xs text-gray-500">
                    <Badge>Info</Badge> Les autres machines du client sont affichées pour pouvoir grouper une livraison.
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}
