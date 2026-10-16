import { groupesParSite, libelleMachine } from '@/lib/connect/libelle'
import { RechercheSynthese } from '@/components/connect/RechercheSynthese'
import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { prisma } from '@/lib/db'
import { trierParNom } from '@/lib/connect/tri'
import { avecEncres } from '@/lib/connect/releves'
import { calculer, type Compteurs } from '@/lib/connect/calcul'
import { VERT, Badge, Encres, depuis, jour, formaterDate, nombre, type Encre } from '@/components/connect/affichage'
import { statutConnexion } from '@/lib/connect/agent'
import { creerClient, marquerMachinesVues, preparerLien } from './actions'
import { clientsEnAlerte, etatsParMachine, NOM_COULEUR, stocksParGroupe, stockDuGroupe, seuilDe, COULEURS } from '@/lib/connect/alertes'
import { cleGroupe, gammeADefinir, grouper } from '@/lib/connect/gammes'

export const dynamic = 'force-dynamic'

export default async function ParcPage() {
  let clients
  let stocks, enAlerte, etatsMachines
  try {
    ;[stocks, enAlerte, etatsMachines] = await Promise.all([stocksParGroupe(), clientsEnAlerte(), etatsParMachine()])
    clients = trierParNom(await prisma.connectClient.findMany({
      orderBy: { nom: 'asc' },
      include: {
        machines: { orderBy: { creeLe: 'asc' }, include: { releves: { orderBy: { date: 'desc' }, take: 10 } } },
        postes: true,
      },
    }))
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

  // sites dont l'ordinateur ne donne plus signe de vie
  const sitesDeconnectes = (c: (typeof clients)[number]) =>
    c.modeReleve === 'agent'
      ? Array.from(new Set(c.postes.filter((p) => statutConnexion(p.derniereConnexion, c.seuilDeconnexionJours) === 'deconnecte').map((p) => p.site)))
      : []

  const machines = clients.flatMap((c) => c.machines.map((m) => ({ ...m, client: c })))
  const nouvelles = machines.filter((m) => !m.vueLe).sort((a, b) => b.creeLe.getTime() - a.creeLe.getTime())

  return (
    <>
      <h1 className="text-2xl font-bold">Synthèse</h1>
      <div className="mt-5 grid grid-cols-3 items-stretch gap-3 sm:gap-4">
        {[
          ['Clients', clients.length, null],
          ['Machines', machines.length, `dont ${machines.filter((m) => m.horsContrat).length} hors contrat`],
          ['Clients en alerte', enAlerte.length, null],
        ].map(([titre, valeur, precision]) => {
          const carte = (
            <div className={`flex h-full flex-col rounded-xl border bg-white p-4 sm:p-5 ${titre === 'Clients en alerte' && Number(valeur) > 0 ? 'border-red-300' : ''}`}>
              <p className="text-sm text-gray-500">{titre}</p>
              <p className={`mt-1 text-3xl font-bold ${titre === 'Clients en alerte' && Number(valeur) > 0 ? 'text-red-600' : ''}`}>{valeur}</p>
              {precision && <p className="mt-0.5 text-xs text-gray-500">{precision}</p>}
            </div>
          )
          return titre === 'Clients en alerte' ? (
            <Link key={String(titre)} href="/parc/alertes" className="block h-full hover:shadow-md">{carte}</Link>
          ) : (
            <div key={String(titre)} className="h-full">{carte}</div>
          )
        })}
      </div>

      {nouvelles.length > 0 && (
        <section className="mt-5 rounded-xl border-2 bg-white p-4" style={{ borderColor: VERT }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">
              {nouvelles.length} nouvelle{nouvelles.length > 1 ? 's' : ''} machine{nouvelles.length > 1 ? 's' : ''} découverte{nouvelles.length > 1 ? 's' : ''}
            </h2>
            <Formulaire action={marquerMachinesVues} message="Marquées comme vues">
              <Bouton className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">Tout marquer comme vu</Bouton>
            </Formulaire>
          </div>
          <ul className="mt-2 divide-y text-sm">
            {nouvelles.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5">
                <Link href={`/parc/client/${m.client.id}`} className="font-semibold underline">{m.client.nom}</Link>
                <span className="text-gray-600">{m.site}</span>
                <Link href={`/parc/machine/${m.id}`} className="underline">{libelleMachine(m, 'Machine inconnue')}</Link>
                <span className="text-xs text-gray-500">{m.marque ?? '?'} · {m.numeroSerie ?? '—'} · découverte le {jour(m.creeLe)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <p className="mt-3 text-sm"><Link href="/parc/clients/import" className="underline">Importer une liste de clients et leur envoyer le lien</Link></p>
      </details>

      {machines.length === 0 && (
        <p className="mt-10 rounded-xl border bg-white p-8 text-center text-gray-600">
          Aucune machine pour l&apos;instant. Elles apparaîtront ici dès qu&apos;un client aura lancé Levad Connect.
        </p>
      )}

      {machines.length > 0 && <RechercheSynthese />}

      <div className="mt-6 space-y-8">
        {clients.map((c) => (
          <section key={c.id} data-client data-nom={c.nom}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{c.nom}</h2>
                <Link href={`/parc/client/${c.id}`} title="Modifier le nom" aria-label={`Modifier le nom de ${c.nom}`} className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-900">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-9.2 9.2-3.7.9.9-3.7 9.2-9.2zM12.5 5.4l2.1 2.1" />
                  </svg>
                </Link>
                {sitesDeconnectes(c).length > 0 && (
                  <Link href="/parc/deconnexions"><Badge ton="rouge">Connexion perdue · {sitesDeconnectes(c).join(', ')}</Badge></Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <Link href={`/parc/stocks/${c.id}`} className="text-gray-600 hover:text-gray-900" title="Voir et modifier le stock de ce client">
                  <span className="underline">Stock</span>
                </Link>
                <span className="text-xs text-gray-500">
                  {c.lienEnvoyeLe ? `Lien envoyé le ${jour(c.lienEnvoyeLe)}` : 'Lien non envoyé'}
                  {c.postes.length > 0 && ` · installé le ${jour(c.postes.reduce((a, p) => (p.premiereConnexion < a ? p.premiereConnexion : a), c.postes[0].premiereConnexion))}`}
                </span>
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
            {groupesParSite(c.machines).map(([site, lesMachines], gi) => {
            // machines du site qui partagent le même stock (cartouches compatibles) : le stock s'affiche une seule fois, sous la liste
            const partages = grouper(lesMachines.filter((x) => x.categorie === 'mine' && !x.horsContrat)).filter((g) => g.machines.length > 1)
            const enPartage = new Set(partages.flatMap((g) => g.machines.map((x) => x.id)))
            return (
            <div key={site} data-site className={gi > 0 ? 'mt-4' : ''}>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">{site}</h3>
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
                    data-machine
                    data-texte={[libelleMachine(m, ''), m.modele, m.nomReseau, m.marque, m.numeroSerie, m.ip, m.site].filter(Boolean).join(' ')}
                    className="grid items-center gap-4 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1.3fr_1.7fr_0.8fr_1fr]"
                  >
                    <div>
                      <p className="font-semibold">
                        {libelleMachine(m, 'Machine inconnue')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {m.marque ?? '?'} · {m.numeroSerie ?? '—'} · {m.ip ?? '—'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {!m.vueLe && <Badge ton="vert">Nouvelle</Badge>}
                        {!suivie && <Badge>Autre marque</Badge>}
                        {encreSuivie && gammeADefinir(m) && <Badge ton="orange">Gamme d’encre à choisir</Badge>}
                        {m.aVerifier && <Badge ton="orange">À vérifier</Badge>}
                      </div>
                    </div>
                    <div>
                      <Encres
                        encres={(avecEncres(m.releves)?.encres ?? []) as unknown as Encre[]}
                        seuils={encreSuivie ? Object.fromEntries(COULEURS.map((c) => [c, seuilDe(m, c)])) : undefined}
                        stock={encreSuivie ? stockDuGroupe(stocks!, c.id, cleGroupe(m)) : undefined}
                        etats={encreSuivie ? Object.fromEntries((etatsMachines?.get(m.id) ?? []).map((x) => [x.couleur, { bas: x.bas, jours: x.jours, mode: x.mode, alerte: x.alerte }])) : undefined}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {encreSuivie
                          ? enPartage.has(m.id)
                            ? 'Stock partagé : voir en bas du site'
                            : `Stock : ${COULEURS.map((k) => `${NOM_COULEUR[k]} ${stockDuGroupe(stocks!, c.id, cleGroupe(m))[k]}`).join(' · ')}`
                          : m.horsContrat
                            ? 'Hors contrat'
                            : 'Autre marque : pas d’alerte d’encre'}
                      </p>
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
              {partages.map((g) => {
                const stock = stockDuGroupe(stocks!, c.id, g.cle)
                return (
                  <div key={g.cle} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-gray-50 px-5 py-3 text-sm">
                    <span className="font-semibold text-gray-700">
                      Stock partagé par {g.machines.map((x) => libelleMachine(x, '').split(' / ').pop()).join(' et ')}{g.gamme ? ` (${g.gamme.code})` : ''} :
                    </span>
                    <span className="text-gray-700">{COULEURS.map((k) => `${NOM_COULEUR[k]} ${stock[k]}`).join(' · ')}</span>
                  </div>
                )
              })}
            </div>
            </div>
            )})}
          </section>
        ))}
      </div>
    </>
  )
}
