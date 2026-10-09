import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { prisma } from '@/lib/db'
import { calculer, type Compteurs } from '@/lib/connect/calcul'
import { VERT, Badge, Encres, depuis, formaterDate, nombre, type Encre } from '@/components/connect/affichage'
import { statutConnexion } from '@/lib/connect/agent'
import { creerClient, preparerLien } from './actions'
import { clientsEnAlerte, NOM_COULEUR, stocksParGroupe, stockDuGroupe, seuilDe, COULEURS } from '@/lib/connect/alertes'
import { cleGroupe, gammeDe } from '@/lib/connect/gammes'

export const dynamic = 'force-dynamic'

// Machines d'un client regroupées par site d'installation, sites par ordre alphabétique.
function groupesParSite<T extends { site: string }>(machines: T[]): [string, T[]][] {
  const m = new Map<string, T[]>()
  for (const x of machines) m.set(x.site, [...(m.get(x.site) ?? []), x])
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
}

export default async function ParcPage() {
  let clients
  let stocks, enAlerte
  try {
    ;[stocks, enAlerte] = await Promise.all([stocksParGroupe(), clientsEnAlerte()])
    clients = await prisma.connectClient.findMany({
      orderBy: { nom: 'asc' },
      include: {
        machines: { orderBy: { creeLe: 'asc' }, include: { releves: { orderBy: { date: 'desc' }, take: 1 } } },
        postes: { orderBy: { derniereConnexion: 'desc' }, take: 1 },
      },
    })
  } catch {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-lg font-bold">La base de données n&apos;est pas encore prête</h1>
        <p className="mt-2 text-gray-700">
          Collez une seule fois le script <code>prisma/migrations/manual_connect_parc.sql</code> dans la console SQL de
          votre base (Vercel, Storage, votre base, SQL Editor), puis rechargez cette page.
        </p>
      </div>
    )
  }

  const deconnecte = (c: (typeof clients)[number]) =>
    c.modeReleve === 'agent' && c.postes[0] && statutConnexion(c.postes[0].derniereConnexion, c.seuilDeconnexionJours) === 'deconnecte'

  const machines = clients.flatMap((c) => c.machines.map((m) => ({ ...m, client: c })))

  return (
    <>
      <h1 className="text-2xl font-bold">Synthèse</h1>
      <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
        {[
          ['Clients', clients.length],
          ['Machines', machines.length],
          ['Clients en alerte', enAlerte.length],
        ].map(([titre, valeur]) => {
          const carte = (
            <div className={`rounded-xl border bg-white p-5 ${titre === 'Clients en alerte' && Number(valeur) > 0 ? 'border-red-300' : ''}`}>
              <p className="text-sm text-gray-500">{titre}</p>
              <p className={`mt-1 text-3xl font-bold ${titre === 'Clients en alerte' && Number(valeur) > 0 ? 'text-red-600' : ''}`}>{valeur}</p>
            </div>
          )
          return titre === 'Clients en alerte' ? (
            <Link key={String(titre)} href="/parc/alertes" className="block hover:shadow-md">{carte}</Link>
          ) : (
            <div key={String(titre)}>{carte}</div>
          )
        })}
      </div>

      <details className="mt-6 rounded-xl border bg-white p-4">
        <summary className="cursor-pointer font-semibold">+ Ajouter un client (pour lui envoyer le lien)</summary>
        <Formulaire action={creerClient} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="grow text-sm font-medium text-gray-700">
            Nom du client
            <input name="nom" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="grow text-sm font-medium text-gray-700">
            Adresse mail (facultatif)
            <input type="email" name="email" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>Créer et obtenir le lien</Bouton>
        </Formulaire>
      </details>

      {machines.length === 0 && (
        <p className="mt-10 rounded-xl border bg-white p-8 text-center text-gray-600">
          Aucune machine pour l&apos;instant. Elles apparaîtront ici dès qu&apos;un client aura lancé Levad Connect.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {clients.map((c) => (
          <section key={c.id}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{c.nom}</h2>
                <Link href={`/parc/client/${c.id}`} title="Modifier le nom" aria-label={`Modifier le nom de ${c.nom}`} className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-900">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-9.2 9.2-3.7.9.9-3.7 9.2-9.2zM12.5 5.4l2.1 2.1" />
                  </svg>
                </Link>
                {deconnecte(c) && (
                  <Link href="/parc/deconnexions"><Badge ton="rouge">Connexion perdue</Badge></Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <Link href={`/parc/stocks/${c.id}`} className="text-gray-600 hover:text-gray-900" title="Voir et modifier le stock de ce client">
                  <span className="underline">Stock</span>
                </Link>
                <form action={preparerLien}>
                  <input type="hidden" name="id" value={c.id} />
                  <Bouton className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold hover:bg-gray-50">
                    {c.codeLien ? 'Lien à envoyer' : 'Générer le lien'}
                  </Bouton>
                </form>
              </div>
            </div>
            {c.machines.length === 0 && (
              <p className="rounded-xl border bg-white p-4 text-sm text-gray-500">
                Aucune machine pour l&apos;instant : elles apparaîtront dès que le client aura installé Levad Connect avec son lien.
              </p>
            )}
            {groupesParSite(c.machines).map(([site, lesMachines], gi, tous) => (
            <div key={site} className={gi > 0 ? 'mt-4' : ''}>
            {tous.length > 1 && <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">{site}</h3>}
            <div className="divide-y rounded-xl border bg-white">
              {lesMachines.map((m) => {
                const r = m.releves[0]
                const compteurs = (r?.compteurs ?? {}) as unknown as Compteurs
                const calc = calculer(compteurs, m.recette)
                const suivie = m.categorie === 'mine'
                const encreSuivie = suivie && !m.horsContrat
                return (
                  <Link
                    key={m.id}
                    href={`/parc/machine/${m.id}`}
                    className="grid items-center gap-4 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1.3fr_1.7fr_0.8fr_1fr]"
                  >
                    <div>
                      <p className="font-semibold">
                        {m.nomAffiche || m.modele || 'Machine inconnue'}
                        <span className="font-normal text-gray-500"> · {m.site}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {m.marque ?? '?'} · {m.numeroSerie ?? '—'} · {m.ip ?? '—'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {!suivie && <Badge>Autre marque</Badge>}
                        {encreSuivie && !gammeDe(m) && <Badge ton="orange">Gamme d’encre à choisir</Badge>}
                        {m.aVerifier && <Badge ton="orange">À vérifier</Badge>}
                      </div>
                    </div>
                    <div>
                      {encreSuivie ? (
                        <>
                        <Encres
                          encres={(r?.encres ?? []) as unknown as Encre[]}
                          seuils={Object.fromEntries(COULEURS.map((c) => [c, seuilDe(m, c)]))}
                          stock={stockDuGroupe(stocks!, c.id, cleGroupe(m))}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Stock : {COULEURS.map((k) => `${NOM_COULEUR[k]} ${stockDuGroupe(stocks!, c.id, cleGroupe(m))[k]}`).join(' · ')}
                        </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">{m.horsContrat ? 'Hors contrat : pas d’alerte d’encre' : 'Pas de suivi d’encre'}</p>
                      )}
                    </div>
                    <div className="text-sm">
                      {suivie && calc.retenue ? (
                        <p className="flex flex-wrap gap-x-4">
                          <span>N&amp;B <strong>{nombre(calc.retenue.nb)}</strong></span>
                          <span>Couleur <strong>{nombre(calc.retenue.couleur)}</strong></span>
                        </p>
                      ) : (
                        <p>Total <strong>{nombre(r?.totalStandard)}</strong></p>
                      )}
                      {suivie && r && calc.aConfigurer && <p className="mt-0.5 text-xs text-gray-400">Compteurs non configurés</p>}
                    </div>
                    <p className="text-sm text-gray-500 md:text-right" title={r ? formaterDate(r.date) : undefined}>
                      {r ? `Relevé ${depuis(r.date)}` : 'Jamais lu'}
                    </p>
                  </Link>
                )
              })}
            </div>
            </div>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
