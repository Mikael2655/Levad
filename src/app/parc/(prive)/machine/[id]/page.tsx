import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RECETTES, calculer, type Compteurs } from '@/lib/connect/calcul'
import { Badge, Encres, VERT, formaterDate, nombre, depuis, type Encre } from '@/components/connect/affichage'
import { basculerHorsContrat, choisirGamme, demanderLecture, enregistrerReglages } from '../../actions'
import { COULEURS, NOM_COULEUR, seuilDe, stockDuGroupe, stocksParGroupe } from '@/lib/connect/alertes'
import { GAMMES, cleGroupe, gammeAuto, gammeDe } from '@/lib/connect/gammes'

export const dynamic = 'force-dynamic'

export default async function MachinePage({ params }: { params: { id: string } }) {
  const machine = await prisma.connectMachine.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, releves: { orderBy: { date: 'desc' }, take: 30 } },
  })
  if (!machine) notFound()
  const clients = await prisma.connectClient.findMany({ orderBy: { nom: 'asc' } })
  const commandeEnCours = await prisma.connectCommande.findFirst({ where: { clientId: machine.clientId, faiteLe: null } })
  const aUnPoste = (await prisma.connectPoste.count({ where: { clientId: machine.clientId } })) > 0
  const stock = stockDuGroupe(await stocksParGroupe(), machine.clientId, cleGroupe(machine))
  const gamme = gammeDe(machine)
  const auto = gammeAuto(machine.modele)
  const seuils = Object.fromEntries(COULEURS.map((c) => [c, seuilDe(machine, c)]))

  const dernier = machine.releves[0]
  const compteurs = (dernier?.compteurs ?? {}) as unknown as Compteurs
  const calc = calculer(compteurs, machine.recette)
  const suivie = machine.categorie === 'mine'
  const utilises = new Set(calc.retenue?.utilises ?? [])
  // Seuls les compteurs de la règle de calcul + le 501 sont montrés ; si aucune règle ne s'applique, on les montre tous pour aider à configurer.
  const toutes = Object.entries(compteurs).sort((a, b) => Number(a[0]) - Number(b[0]))
  const lignes = utilises.size ? toutes.filter(([n]) => utilises.has(Number(n)) || n === '501') : toutes
  const scans = compteurs['501']
  const encres = (dernier?.encres ?? []) as unknown as Encre[]
  const bacs = (dernier?.bacs ?? []) as unknown as Encre[]

  return (
    <>
      <Link href="/parc" className="text-sm text-gray-500 hover:text-gray-900">← Retour à la synthèse</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{machine.nomAffiche || machine.modele || 'Machine inconnue'}</h1>
        {!suivie && <Badge>Autre marque</Badge>}
        {machine.horsContrat && <Badge ton="gris">Hors contrat</Badge>}
        {machine.aVerifier && <Badge ton="orange">À vérifier</Badge>}
      </div>
      <p className="mt-1 text-gray-600">
        <Link href={`/parc/client/${machine.client.id}`} className="underline">{machine.client.nom}</Link> ·{' '}
        {machine.site} · {machine.marque ?? '?'} {machine.modele ?? ''} · n° {machine.numeroSerie ?? '—'} · IP {machine.ip ?? '—'}
      </p>
      {suivie && !machine.horsContrat && !gamme && (
        <Formulaire action={choisirGamme} message="Gamme enregistrée" className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <input type="hidden" name="id" value={machine.id} />
          <label className="grow text-sm font-medium text-gray-800">
            Gamme d&apos;encre non reconnue : choisissez-la (ex. C-EXV 49)
            <select name="gamme" defaultValue="" required className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
              <option value="" disabled>Choisir la gamme…</option>
              {GAMMES.map((g) => (
                <option key={g.code} value={g.code}>{g.code} — {g.modeles}</option>
              ))}
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
      <p className="mt-2 text-sm text-gray-500">
        {dernier ? `Dernier relevé : ${formaterDate(dernier.date)} (${depuis(dernier.date)})` : 'Aucun relevé'}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Niveaux d'encre */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Niveaux d&apos;encre</h2>
          {suivie && !machine.horsContrat ? (
            <>
              <div className="mt-4">
                <Encres encres={encres} seuils={seuils} stock={stock} grand />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Stock de cartouches chez ce client :{' '}
                {COULEURS.map((c) => `${NOM_COULEUR[c]} ${stock[c]}`).join(' · ')}.{' '}
                <Link href={`/parc/stocks/${machine.clientId}`} className="underline">Gérer le stock</Link>
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
            </>
          ) : (
            <p className="mt-3 text-gray-600">{machine.horsContrat ? 'Machine hors contrat : pas d’alerte d’encre.' : 'Pas de suivi d’encre pour les autres marques.'}</p>
          )}
        </section>

        {/* Totaux */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Totaux (A3 compté double)</h2>
          {suivie && calc.retenue ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Total N&amp;B</p>
                  <p className="text-3xl font-bold">{nombre(calc.retenue.nb)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Total couleur</p>
                  <p className="text-3xl font-bold">{nombre(calc.retenue.couleur)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Recette {calc.retenue.code} — {calc.retenue.nom} ({calc.retenue.formule}){' '}
                {!machine.recette && <span className="text-gray-400">· choisie automatiquement</span>}
              </p>
              {calc.avertissement && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {calc.avertissement}
                  <ul className="mt-1 list-disc pl-5">
                    {calc.applicables.map((r) => (
                      <li key={r.code}>
                        Recette {r.code} ({r.nom}) : N&amp;B {nombre(r.nb)} · couleur {nombre(r.couleur)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {calc.choixImpossible && (
                <p className="mt-3 text-sm text-red-600">La recette choisie ne peut pas s&apos;appliquer : il manque des compteurs.</p>
              )}
            </>
          ) : suivie ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Compteurs à configurer.</strong> Aucune recette ne s&apos;applique à cette machine : il manque des
              compteurs. Regardez la liste ci-dessous pour voir ceux qu&apos;elle fournit.
            </div>
          ) : (
            <p className="mt-3 text-gray-600">Autre marque : seul le compteur total standard est lu.</p>
          )}
          <p className="mt-4 text-sm text-gray-600">
            Compteur total standard : <strong>{nombre(dernier?.totalStandard)}</strong>
            {scans && (
              <>
                {' '}· Scans (501) : <strong>{nombre(scans.v)}</strong> <span className="text-gray-400">(affichés à part)</span>
              </>
            )}
          </p>
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
              {GAMMES.map((g) => (
                <option key={g.code} value={g.code}>{g.code} — {g.modeles}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-gray-500">
              {gamme ? `Partage son stock avec les machines de même gamme du site « ${machine.site} ».` : 'Gamme non reconnue : cette machine a son propre stock tant que vous ne choisissez pas sa gamme.'}
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
          <label className="text-sm font-medium text-gray-700">
            Catégorie
            <select name="categorie" defaultValue={machine.categorie} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="mine">Mes machines (Canon vendues par LEVAD)</option>
              <option value="autre">Autre machine</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Règle de calcul
            <select name="recette" defaultValue={machine.recette ?? ''} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Automatique (la première qui s&apos;applique)</option>
              {RECETTES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.nom} ({r.formule})
                </option>
              ))}
            </select>
          </label>
          <fieldset className="md:col-span-3">
            <legend className="text-sm font-medium text-gray-700">Seuil d&apos;alerte par couleur (%)</legend>
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

      {/* Hors contrat */}
      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Machine hors contrat</h2>
        <p className="mt-1 text-sm text-gray-600">
          Une machine hors contrat ne déclenche plus aucune alerte d&apos;encre (Canon ou autre marque) et ne figurera pas dans les exports.
        </p>
        <Formulaire action={basculerHorsContrat} message="Enregistré" className="mt-3">
          <input type="hidden" name="id" value={machine.id} />
          <Bouton className={`rounded-lg px-4 py-2 font-semibold ${machine.horsContrat ? 'text-white' : 'border border-gray-300 bg-white'}`} style={machine.horsContrat ? { backgroundColor: VERT } : undefined}>
            {machine.horsContrat ? 'Remettre sous contrat' : 'Machine hors contrat'}
          </Bouton>
        </Formulaire>
      </section>

      {/* Compteurs bruts */}
      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">{utilises.size ? 'Compteurs de la règle de calcul' : `Compteurs lus (${lignes.length})`}</h2>
        {lignes.length === 0 ? (
          <p className="mt-2 text-gray-600">Aucun compteur numéroté (machine d&apos;une autre marque).</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">N°</th>
                  <th className="py-2 pr-4">Nom</th>
                  <th className="py-2 text-right">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(([n, c]) => (
                  <tr key={n} className={`border-b last:border-0 ${utilises.has(Number(n)) ? 'bg-green-50 font-semibold' : ''}`}>
                    <td className="py-1.5 pr-4">{n}</td>
                    <td className="py-1.5 pr-4 text-gray-600">{c.nom ?? ''}</td>
                    <td className="py-1.5 text-right tabular-nums">{nombre(c.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">Compteurs utilisés par la règle de calcul retenue, et le 501 (scans).</p>
          </div>
        )}
      </section>

      {/* Historique */}
      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Historique des relevés</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4 text-right">N&amp;B</th>
                <th className="py-2 pr-4 text-right">Couleur</th>
                <th className="py-2 text-right">Total standard</th>
              </tr>
            </thead>
            <tbody>
              {machine.releves.map((r) => {
                const t = calculer((r.compteurs ?? {}) as unknown as Compteurs, machine.recette).retenue
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{formaterDate(r.date)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{nombre(t?.nb)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{nombre(t?.couleur)}</td>
                    <td className="py-1.5 text-right tabular-nums">{nombre(r.totalStandard)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
