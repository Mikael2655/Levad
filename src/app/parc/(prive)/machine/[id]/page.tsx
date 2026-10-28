import { libelleMachine } from '@/lib/connect/libelle'
import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { avecEncres } from '@/lib/connect/releves'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { trierParNom } from '@/lib/connect/tri'
import { NOM_COURT_COMPTEUR, calculer, totauxStandard, type Compteurs } from '@/lib/connect/calcul'
import { Badge, Encres, VERT, formaterDate, nombre, depuis, type Encre } from '@/components/connect/affichage'
import { chercherReference, choisirGamme, demanderLecture, enregistrerReglages } from '../../actions'
import { COULEURS, NOM_COULEUR, etatsParMachine, seuilDe, stockDuGroupe, stocksParGroupe } from '@/lib/connect/alertes'
import { FAMILLES, GAMME_AUTRES, cleGroupe, gammeADefinir, gammeAuto, gammeDe } from '@/lib/connect/gammes'

export const dynamic = 'force-dynamic'

export default async function MachinePage({ params }: { params: { id: string } }) {
  const machine = await prisma.connectMachine.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, releves: { orderBy: { date: 'desc' }, take: 10 } },
  })
  if (!machine) notFound()
  const clients = trierParNom(await prisma.connectClient.findMany({ orderBy: { nom: 'asc' } }))
  const commandeEnCours = await prisma.connectCommande.findFirst({ where: { clientId: machine.clientId, faiteLe: null } })
  const aUnPoste = (await prisma.connectPoste.count({ where: { clientId: machine.clientId } })) > 0
  const stock = stockDuGroupe(await stocksParGroupe(), machine.clientId, cleGroupe(machine))
  const gamme = gammeDe(machine)
  const auto = gammeAuto(machine.modele)
  const seuils = Object.fromEntries(COULEURS.map((c) => [c, seuilDe(machine, c)]))
  const etatsCouleurs = (await etatsParMachine()).get(machine.id) ?? []
  const etats = Object.fromEntries(etatsCouleurs.map((c) => [c.couleur, { bas: c.bas, jours: c.jours, mode: c.mode, alerte: c.alerte }]))

  const dernier = machine.releves[0]
  const compteurs = (dernier?.compteurs ?? {}) as unknown as Compteurs
  const calc = calculer(compteurs, machine.recette)
  const std = totauxStandard(compteurs)
  const suivie = machine.categorie === 'mine'
  // 112 / 113 / 122 / 123 / 501 toujours ; les autres compteurs (108, 109, 106, 125…) seulement s'ils servent au calcul retenu
  const utilises = new Set((calc.retenue?.utilises ?? []).map(String))
  const DETAIL = ['108', '109', '106', '112', '113', '125', '122', '123', '501'].filter((n) => ['112', '113', '122', '123', '501'].includes(n) || (utilises.has(n) && compteurs[n]))
  const historique = await Promise.all(
    [7, 14, 21, 28].map(async (jours) => {
      const releve = await prisma.connectReleve.findFirst({
        where: { machineId: machine.id, date: { lte: new Date(Date.now() - jours * 86400000) }, NOT: { encres: { equals: Prisma.DbNull } } },
        orderBy: { date: 'desc' },
        select: { date: true, encres: true },
      })
      return { jours, date: releve?.date ?? null, encres: (releve?.encres ?? []) as unknown as Encre[] }
    }),
  )
  const dernierEncres = avecEncres(machine.releves)
  const encres = (dernierEncres?.encres ?? []) as unknown as Encre[]
  const bacs = (dernierEncres?.bacs ?? []) as unknown as Encre[]

  return (
    <>
      <Link href="/parc" className="text-sm text-gray-500 hover:text-gray-900">← Retour à la synthèse</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{libelleMachine(machine, 'Machine inconnue')}</h1>
        {!suivie && <Badge>Autre marque</Badge>}
        {machine.horsContrat && <Badge ton="gris">Hors contrat</Badge>}
        {machine.aVerifier && <Badge ton="orange">À vérifier</Badge>}
      </div>
      <p className="mt-1 text-gray-600">
        <Link href={`/parc/client/${machine.client.id}`} className="underline">{machine.client.nom}</Link> ·{' '}
        {machine.site} · {machine.marque ?? '?'} {machine.modele ?? ''} · n° {machine.numeroSerie ?? '—'} · IP {machine.ip ?? '—'}
      </p>
      {suivie && !machine.horsContrat && gammeADefinir(machine) && (
        <Formulaire action={choisirGamme} message="Gamme enregistrée" className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <input type="hidden" name="id" value={machine.id} />
          <label className="grow text-sm font-medium text-gray-800">
            Gamme d&apos;encre non reconnue : choisissez-la (ex. C-EXV 49)
            <select name="gamme" defaultValue="" required className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
              <option value="" disabled>Choisir la gamme…</option>
              {FAMILLES.map((g) => (
                <option key={g.cle} value={g.cle}>{g.cle} — {g.modeles}</option>
              ))}
              <option value={GAMME_AUTRES}>Autres (cartouches non listées)</option>
            </select>
          </label>
          <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>Valider</Bouton>
        </Formulaire>
      )}
      {aUnPoste && (
        <Formulaire action={demanderLecture} message="Demande envoyée" className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="machineId" value={machine.id} />
          <Bouton
            disabled={Boolean(commandeEnCours)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Actualiser maintenant
          </Bouton>
          <span className="text-sm text-gray-500">
            {commandeEnCours
              ? `Demande envoyée ${depuis(commandeEnCours.creeLe)} : la lecture arrive en quelques minutes (rechargez la page).`
              : 'Demande une lecture immédiate au programme installé chez le client.'}
          </span>
        </Formulaire>
      )}
      {(!suivie || !gammeAuto(machine.modele)) && (
        <Formulaire action={chercherReference} message="Référence trouvée" className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={machine.id} />
          <Bouton className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold">Trouver la référence avec le n° de série</Bouton>
          <span className="text-sm text-gray-500">Recherche la référence exacte de la machine (marque + numéro de série). Compter une dizaine de secondes.</span>
        </Formulaire>
      )}
      <p className="mt-2 text-sm text-gray-500">
        {dernier ? `Dernier relevé : ${formaterDate(dernier.date)} (${depuis(dernier.date)})` : 'Aucun relevé'}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Niveaux d'encre */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Niveaux d&apos;encre</h2>
          <>
              <div className="mt-4">
                <Encres encres={encres} seuils={suivie && !machine.horsContrat ? seuils : undefined} stock={suivie && !machine.horsContrat ? stock : undefined} etats={suivie && !machine.horsContrat ? etats : undefined} grand />
              </div>
              {encres.length > 0 && COULEURS.some((c) => !encres.find((e) => e.couleur === c && e.pourcent !== null)) && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                  <p className="font-semibold text-gray-700">Niveaux que la machine ne communique pas</p>
                  <ul className="mt-1 space-y-0.5">
                    {COULEURS.filter((c) => !encres.find((e) => e.couleur === c && e.pourcent !== null)).map((c) => {
                      const e = encres.find((x) => x.couleur === c)
                      return (
                        <li key={c}>
                          <strong>{NOM_COULEUR[c]}</strong> :{' '}
                          {e ? `${e.note ?? 'niveau non communiqué'}${e.description ? ` (« ${e.description} »)` : ''}` : 'la machine ne déclare pas cette cartouche'}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-xs text-gray-500">
                {suivie && !machine.horsContrat ? (
                  <>
                    Stock de cartouches chez ce client :{' '}
                    {COULEURS.map((c) => `${NOM_COULEUR[c]} ${stock[c]}`).join(' · ')}.{' '}
                    <Link href={`/parc/client/${machine.clientId}#stock`} className="underline">Gérer le stock</Link>
                  </>
                ) : machine.horsContrat ? (
                  'Hors contrat : niveaux affichés à titre indicatif, aucune alerte.'
                ) : (
                  'Autre marque : niveaux affichés à titre indicatif, aucune alerte.'
                )}
              </p>
              <h3 className="mt-5 text-sm font-semibold text-gray-700">Bacs récupérateurs</h3>
              {bacs.length ? (
                <ul className="mt-1 text-sm text-gray-600">
                  {bacs.map((b, i) => (
                    <li key={i}>
                      {b.description ?? 'Bac'} : {b.pourcent !== null ? `${b.pourcent} % plein` : `non disponible (${b.note ?? 'niveau non communiqué'})`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-600">Non disponible (la machine n&apos;en déclare pas).</p>
              )}
              <details className="group mt-5">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
                  <span className="inline-block text-gray-400 transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
                  Niveaux précédents
                </summary>
                <div className="mt-2 space-y-3">
                {historique.map((h) => (
                  <div key={h.jours}>
                    <p className="text-xs text-gray-500">
                      Il y a {h.jours} jours{h.date ? ` — ${h.date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}` : ''}
                    </p>
                    {h.date ? <Encres encres={h.encres} /> : <p className="text-sm text-gray-400">Pas de relevé à cette date</p>}
                  </div>
                ))}
              </div>
              </details>
          </>
        </section>

        {/* Totaux */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Totaux (A3 compté double)</h2>
          {suivie ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <div className="space-y-4">
                {calc.retenue ? (
                  <>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Total N&amp;B</p>
                      <p className="text-2xl font-bold">{nombre(calc.retenue.nb)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Total couleur</p>
                      <p className="text-2xl font-bold">{nombre(calc.retenue.couleur)}</p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    Totaux indisponibles : il manque des compteurs sur cette machine.
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">Détail des compteurs</p>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {DETAIL.map((n) => (
                      <tr key={n} className="border-b last:border-0">
                        <td className="whitespace-nowrap py-1 pr-3 font-semibold">{n}</td>
                        <td className="whitespace-nowrap py-1 pr-3 text-gray-600" title={compteurs[n]?.nom ?? undefined}>{NOM_COURT_COMPTEUR[n] ?? compteurs[n]?.nom ?? ''}</td>
                        <td className="whitespace-nowrap py-1 text-right tabular-nums">{compteurs[n] ? nombre(compteurs[n].v) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {std ? (
                <>
                  {std.nb !== null && (
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">N&amp;B</p>
                      <p className="text-3xl font-bold">{nombre(std.nb)}</p>
                    </div>
                  )}
                  {std.couleur !== null && (
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Couleur</p>
                      <p className="text-3xl font-bold">{nombre(std.couleur)}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-3xl font-bold">{nombre(dernier?.totalStandard ?? std.total)}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-3xl font-bold">{nombre(dernier?.totalStandard)}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Réglages */}
      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Réglages de cette machine</h2>
        <Formulaire action={enregistrerReglages} message="Réglages enregistrés" className="mt-4 grid gap-4 md:grid-cols-3">
          <input type="hidden" name="id" value={machine.id} />
          <label className="text-sm font-medium text-gray-700">
            Nom affiché
            <input name="nomAffiche" defaultValue={machine.nomAffiche ?? ''} placeholder={machine.modele ?? ''} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Site d&apos;installation
            <input name="site" defaultValue={machine.site} placeholder="Site principal" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Gamme d&apos;encre (cartouches compatibles)
            <select name="gamme" defaultValue={machine.gamme ?? ''} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">{auto ? `Automatique : ${auto.code} (${auto.modeles})` : 'Automatique : modèle non reconnu'}</option>
              {FAMILLES.map((g) => (
                <option key={g.cle} value={g.cle}>{g.cle} — {g.modeles}</option>
              ))}
              <option value={GAMME_AUTRES}>Autres (cartouches non listées)</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-gray-500">
              {gamme ? `Partage son stock avec les machines de même gamme du site « ${machine.site} ».` : machine.gamme === GAMME_AUTRES ? 'Gamme « Autres » : cette machine a son propre stock.' : 'Gamme non reconnue : cette machine a son propre stock tant que vous ne choisissez pas sa gamme.'}
            </span>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Client
            <select name="clientId" defaultValue={machine.clientId} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </label>
          <label className="self-end pb-1 text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              <input type="checkbox" name="horsContrat" defaultChecked={machine.horsContrat} className="h-4 w-4" />
              Machine hors contrat
            </span>
            <span className="mt-1 block text-xs font-normal text-gray-500">Plus d&apos;alerte d&apos;encre, et absente des exports.</span>
          </label>
          <fieldset className="md:col-span-3">
            <legend className="text-sm font-medium text-gray-700">Seuil d&apos;alerte par couleur (%)</legend>
            <p className="text-xs text-gray-500">
              L&apos;alerte se déclenche quand il reste moins de 10 jours d&apos;encre (estimés d&apos;après la consommation). Après un changement de cartouche, la consommation de la précédente est reprise. Ce seuil en % ne sert que tant que la machine n&apos;a pas assez d&apos;historique (moins de 7 jours de mesures).
            </p>
            <div className="mt-1 grid grid-cols-2 gap-4 md:grid-cols-4">
              {COULEURS.map((c) => (
                <label key={c} className="text-sm text-gray-600">
                  {NOM_COULEUR[c]}
                  <input
                    type="number"
                    name={`seuil${NOM_COULEUR[c]}`}
                    min={0}
                    max={100}
                    defaultValue={seuilDe(machine, c)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-end">
            <Bouton className="rounded-lg px-5 py-2.5 font-semibold text-white" style={{ backgroundColor: VERT }}>
              Enregistrer
            </Bouton>
          </div>
        </Formulaire>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Ce que la machine déclare</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="text-gray-500">Modèle retenu</dt>
          <dd>{machine.modele ?? '—'}</dd>
          <dt className="text-gray-500">Nom donné par le client</dt>
          <dd>{machine.nomReseau ?? '—'}</dd>
          <dt className="text-gray-500">Description technique</dt>
          <dd className="break-words">{machine.sysDescr ?? '— (apparaît au prochain relevé)'}</dd>
          <dt className="text-gray-500">N° de série</dt>
          <dd>{machine.numeroSerie ?? '—'}</dd>
        </dl>
      </section>
    </>
  )
}
