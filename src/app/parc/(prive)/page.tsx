import Link from 'next/link'
import { prisma } from '@/lib/db'
import { calculer, type Compteurs } from '@/lib/connect/calcul'
import { Badge, Encres, depuis, formaterDate, nombre, type Encre } from '@/components/connect/affichage'
import { statutConnexion } from '@/lib/connect/agent'
import { preparerLien } from './actions'
import { clientsEnAlerte, NOM_COULEUR, stocksParClient, stockVide, seuilDe, COULEURS } from '@/lib/connect/alertes'

export const dynamic = 'force-dynamic'

export default async function ParcPage() {
  let clients
  let stocks, enAlerte
  try {
    ;[stocks, enAlerte] = await Promise.all([stocksParClient(), clientsEnAlerte()])
    clients = await prisma.connectClient.findMany({
      where: { machines: { some: {} } },
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
  const aConfigurer = machines.filter(
    (m) => m.categorie === 'mine' && m.releves[0] && calculer((m.releves[0].compteurs ?? {}) as unknown as Compteurs).aConfigurer
  )

  return (
    <>
      <h1 className="text-2xl font-bold">Synthèse</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          ['Clients', clients.length],
          ['Machines', machines.length],
          ['Clients en alerte', enAlerte.length],
          ['Compteurs à configurer', aConfigurer.length],
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
                  Stock : {COULEURS.map((k) => `${NOM_COULEUR[k]} ${(stocks?.get(c.id) ?? stockVide())[k]}`).join(' · ')}{' '}
                  <span className="underline">Gérer</span>
                </Link>
                <form action={preparerLien}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold hover:bg-gray-50">
                    {c.codeLien ? 'Lien à envoyer' : 'Générer le lien'}
                  </button>
                </form>
              </div>
            </div>
            <div className="divide-y rounded-xl border bg-white">
              {c.machines.map((m) => {
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
                      <p className="font-semibold">{m.nomAffiche || m.modele || 'Machine inconnue'}</p>
                      <p className="text-sm text-gray-500">
                        {m.marque ?? '?'} · n° {m.numeroSerie ?? '—'} · {m.ip ?? '—'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {!suivie && <Badge>Autre marque</Badge>}
                        {m.horsContrat && <Badge ton="gris">Hors contrat</Badge>}
                        {m.aVerifier && <Badge ton="orange">À vérifier</Badge>}
                        {suivie && r && calc.aConfigurer && <Badge ton="orange">Compteurs à configurer</Badge>}
                      </div>
                    </div>
                    <div>
                      {encreSuivie ? (
                        <Encres
                          encres={(r?.encres ?? []) as unknown as Encre[]}
                          seuils={Object.fromEntries(COULEURS.map((c) => [c, seuilDe(m, c)]))}
                          stock={stocks?.get(c.id) ?? stockVide()}
                        />
                      ) : (
                        <p className="text-sm text-gray-400">{m.horsContrat ? 'Hors contrat : pas d’alerte d’encre' : 'Pas de suivi d’encre'}</p>
                      )}
                    </div>
                    <div className="text-sm">
                      {suivie && calc.retenue ? (
                        <>
                          <p>N&amp;B <strong>{nombre(calc.retenue.nb)}</strong></p>
                          <p>Couleur <strong>{nombre(calc.retenue.couleur)}</strong></p>
                        </>
                      ) : (
                        <p>Total <strong>{nombre(r?.totalStandard)}</strong></p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 md:text-right" title={r ? formaterDate(r.date) : undefined}>
                      {r ? `Relevé ${depuis(r.date)}` : 'Jamais lu'}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
