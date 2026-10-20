import { libelleMachine } from '@/lib/connect/libelle'
import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { avecEncres } from '@/lib/connect/releves'
import { PreparationEnvoi, type PlanEnvoi } from '@/components/connect/PreparationEnvoi'
import { Encres, VERT, formaterDate, depuis, type Encre } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR, detailsParGroupe, etatsParMachine, minimumDuGroupe, minimumsParGroupe, seuilDe, stockDuGroupe, stocksParGroupe } from '@/lib/connect/alertes'
import { FAMILLES, GAMME_AUTRES, familleDe, grouper } from '@/lib/connect/gammes'
import { ajouterEnvoi, choisirGamme, corrigerStock, definirStockMinimum, supprimerEnvoi, supprimerMouvement } from '../../actions'

export const dynamic = 'force-dynamic'

const champ = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2'

export default async function StockClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.connectClient.findUnique({
    where: { id: Number(params.id) },
    include: {
      machines: {
        where: { categorie: 'mine', horsContrat: false },
        orderBy: [{ site: 'asc' }, { creeLe: 'asc' }],
        include: { releves: { orderBy: { date: 'desc' }, take: 10 } },
      },
    },
  })
  if (!client) notFound()
  const stocks = await stocksParGroupe()
  const etats = await etatsParMachine()
  const details = await detailsParGroupe()
  const minimums = await minimumsParGroupe()
  const groupes = grouper(client.machines)
  const mouvements = await prisma.connectStockMouvement.findMany({ where: { clientId: client.id }, orderBy: { date: 'desc' }, take: 120 })

  // Plans d'envoi d'après les alertes : une cartouche par machine concernée et par couleur.
  // « Avec optimisation » ajoute les couleurs sans stock à moins de 10 points au-dessus de leur seuil.
  function plan(avec: boolean): PlanEnvoi {
    const valeurs: Record<string, number> = {}
    const aChoisir: string[] = []
    groupes.forEach((g, i) => {
      const variantes = g.gamme ? familleDe(g.gamme).variantes : [null]
      for (const c of COULEURS) {
        const concernees = g.machines.filter((m) => {
          const e = (etats.get(m.id) ?? []).find((x) => x.couleur === c)
          if (!e) return false
          return e.alerte || (avec && e.pourcent !== null && e.pourcent <= e.seuil + 10 && e.stock <= e.minimum)
        })
        if (concernees.length === 0) continue
        const possibles = variantes.map((v, vi) => (v === null || v.refs[c] ? vi : -1)).filter((vi) => vi >= 0)
        if (possibles.length === 0) continue
        if (possibles.length === 1) {
          valeurs[`qte_${i}_${c}_${possibles[0]}`] = concernees.length
        } else {
          aChoisir.push(`${NOM_COULEUR[c]} · ${g.site} · ${concernees.map((m) => libelleMachine(m, 'machine').split(' / ').pop()).join(' + ')} : ${possibles.map((vi) => variantes[vi]!.code).join(' ou ')}`)
        }
      }
    })
    return { valeurs, nb: Object.values(valeurs).reduce((n, q) => n + q, 0), aChoisir }
  }
  const planSans = plan(false)
  const planAvec = plan(true)

  // Derniers mouvements : les lignes d'un même envoi (même instant) sont regroupées en un seul envoi.
  type Mouvement = (typeof mouvements)[number]
  const evenements: { cle: string; date: Date; motif: string; lignes: Mouvement[] }[] = []
  for (const m of mouvements) {
    const cle = m.motif === 'envoi' ? `envoi|${m.date.getTime()}` : `m${m.id}`
    const existant = evenements.find((e) => e.cle === cle)
    if (existant) existant.lignes.push(m)
    else evenements.push({ cle, date: m.date, motif: m.motif, lignes: [m] })
  }
  const nomGroupe = (g: string) => (g ? g.replace('|', ' · ').replace(/machine-\d+/, 'machine seule') : 'Ancien stock')
  const libLigne = (m: Mouvement) => `${NOM_COULEUR[m.couleur as keyof typeof NOM_COULEUR] ?? m.couleur} ${m.delta > 0 && m.motif !== 'envoi' ? `+${m.delta}` : m.delta}${m.variante ? ` (${m.variante})` : ''}`
  const noteDe = (lignes: Mouvement[]) =>
    Array.from(new Set(lignes.map((m) => (m.note ?? '').replace(/ ?\(jeu complet\)$/, '').replace(/^Jeu complet$/, '').trim()).filter(Boolean))).join(' — ')

  return (
    <>
      <Link href="/parc/stocks" className="text-sm text-gray-500 hover:text-gray-900">← Stock actuel de tous les clients</Link>
      <h1 className="mt-3 text-2xl font-bold">{client.nom}</h1>
      
      {groupes.length === 0 && <p className="mt-6 rounded-xl border bg-white p-6 text-gray-600">Aucune machine suivie pour ce client.</p>}
      {groupes.map((g) => {
        const stock = stockDuGroupe(stocks, client.id, g.cle)
        const minimum = minimumDuGroupe(minimums, client.id, g.cle)
        const variantes = g.gamme ? familleDe(g.gamme).variantes : []
        const detail = details.get(`${client.id}#${g.cle}`) ?? {}
        const couleursDuGroupe = variantes.length ? COULEURS.filter((c) => variantes.some((v) => v.refs[c])) : COULEURS
        return (
          <section key={g.cle} className="mt-6 rounded-xl border bg-white p-6">
            <h2 className="text-lg font-bold">
              {g.site} · {g.gamme ? `${variantes.map((v) => v.code).join(' / ')} (${g.gamme.modeles})` : g.machines.every((m) => m.gamme === GAMME_AUTRES) ? 'Autres' : 'gamme non reconnue'}
            </h2>
            {!g.gamme && !g.machines.every((m) => m.gamme === GAMME_AUTRES) && (
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">
                  Gamme d&apos;encre non reconnue : ce stock est propre à cette machine. Choisissez sa gamme pour le partager avec les machines compatibles du site.
                </p>
                {g.machines.map((m) => (
                  <Formulaire key={m.id} action={choisirGamme} message="Gamme enregistrée" className="mt-2 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="id" value={m.id} />
                    <label className="grow text-sm font-medium text-gray-700">
                      Gamme de {libelleMachine(m, 'la machine')}
                      <select name="gamme" defaultValue="" required className={champ}>
                        <option value="" disabled>Choisir la gamme (ex. C-EXV 49)…</option>
                        {FAMILLES.map((x) => (
                          <option key={x.cle} value={x.cle}>{x.cle} — {x.modeles}</option>
                        ))}
                        <option value={GAMME_AUTRES}>Autres (cartouches non listées)</option>
                      </select>
                    </label>
                    <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>Valider</Bouton>
                  </Formulaire>
                ))}
              </div>
            )}
            <div className="mt-3 divide-y">
              {g.machines.map((m) => {
                const r = m.releves[0]
                const re = avecEncres(m.releves)
                return (
                  <Link key={m.id} href={`/parc/machine/${m.id}`} className="grid items-center gap-3 py-3 hover:bg-gray-50 md:grid-cols-[1.2fr_2fr_1fr]">
                    <p className="font-semibold">{libelleMachine(m, 'Machine inconnue')}</p>
                    <Encres
                      encres={(re?.encres ?? []) as unknown as Encre[]}
                      seuils={Object.fromEntries(COULEURS.map((c) => [c, seuilDe(m, c)]))}
                      etats={Object.fromEntries((etats.get(m.id) ?? []).map((x) => [x.couleur, { bas: x.bas, jours: x.jours, mode: x.mode, alerte: x.alerte }]))}
                      stock={stock}
                    />
                    <p className="text-sm text-gray-500 md:text-right">{r ? `Relevé ${depuis(r.date)}` : 'Jamais lu'}</p>
                  </Link>
                )
              })}
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-700">Stock actuel</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {couleursDuGroupe.map((c) => (
                <div key={c} className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-sm text-gray-500">{NOM_COULEUR[c]}</p>
                  <p className={`text-2xl font-bold ${stock[c] === 0 ? 'text-gray-400' : ''}`}>{stock[c]}</p>
                  {minimum[c] > 0 && <p className="text-xs text-gray-500">minimum {minimum[c]}</p>}
                  {variantes.length === 1 && g.gamme?.refs[c] && <p className="text-xs text-gray-500">{g.gamme.refs[c]}</p>}
                  {variantes.length > 1 && (
                    <ul className="mt-1 space-y-0.5 text-left text-xs text-gray-500">
                      {variantes.filter((v) => v.refs[c]).map((v) => {
                        const n = detail[c]?.[variantes.indexOf(v) === 0 ? '' : v.code] ?? 0
                        return (
                        <li key={v.code} className="flex justify-between gap-2">
                          <span title={v.refs[c] ?? ''}>{v.code}</span>
                          <strong className={n > 0 ? 'text-gray-900' : 'text-gray-400'}>{n}</strong>
                        </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <Formulaire action={definirStockMinimum} message="Stock minimum enregistré" className="mt-4 rounded-lg border border-dashed border-gray-300 p-3">
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="groupe" value={g.cle} />
              <p className="text-sm font-semibold text-gray-700">Stock minimum à garder d&apos;avance</p>
              <p className="text-xs text-gray-500">
                Quand le stock descend à ce nombre (ou en dessous), l&apos;alerte se déclenche comme si le client n&apos;en avait plus. 0 = pas de minimum.
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                {couleursDuGroupe.map((c) => (
                  <label key={c} className="text-sm font-medium text-gray-700">
                    {NOM_COULEUR[c]}
                    <input type="number" inputMode="numeric" name={`min_${c}`} min={0} max={99} defaultValue={minimum[c]} className="mt-1 block w-20 rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                ))}
                <Bouton className="rounded-lg border border-gray-300 px-4 py-2 font-semibold">Enregistrer</Bouton>
              </div>
            </Formulaire>
          </section>
        )
      })}

      {groupes.length > 0 && (
        <section id="envoi" className="mt-6 scroll-mt-4 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Saisir un envoi de cartouches</h2>
          <p className="text-sm text-gray-500">Indiquez la quantité de chaque couleur envoyée (0 ou vide = aucune). « Jeu complet » compte une cartouche de chaque couleur ; pour une version L ou H dont le noir n'existe pas, le noir est celui de la version standard.</p>
          <Formulaire action={ajouterEnvoi} message="Envoi enregistré" reinitialiser className="mt-4 space-y-5">
            <input type="hidden" name="clientId" value={client.id} />
            <PreparationEnvoi sans={planSans} avec={planAvec} />
            {groupes.map((g, i) => (
              <div key={g.cle}>
                <input type="hidden" name={`groupe_${i}`} value={g.cle} />
                <p className="text-sm font-semibold text-gray-700">
                  {g.site} · {g.gamme ? familleDe(g.gamme).variantes.map((v) => v.code).join(' / ') : g.machines.map((m) => libelleMachine(m, '')).join(', ')}
                </p>
                {(() => {
                  const variantes = g.gamme ? familleDe(g.gamme).variantes : [null]
                  const couleurs = g.gamme ? COULEURS.filter((c) => familleDe(g.gamme!).variantes.some((v) => v.refs[c])) : COULEURS
                  // cases aussi larges que leur texte de référence (« C-EXV 49 - 8524B002 »)
                  const case_ = 'mt-1 block w-0 min-w-full rounded-lg border border-gray-300 px-3 py-2'
                  return (
                    <div className="mt-1 flex flex-wrap items-start gap-x-5 gap-y-3">
                      {couleurs.length > 1 && (
                        <div className="w-fit text-sm font-semibold text-gray-700">
                          Jeu complet
                          {variantes.map((v, vi) => (
                            <label key={vi} className="mt-1 block w-fit whitespace-nowrap text-xs font-normal text-gray-500">
                              {v ? `${v.code} - ${couleurs.length} cartouches` : `${couleurs.length} cartouches`}
                              <input type="number" inputMode="numeric" name={`jeu_${i}_${vi}`} min={0} defaultValue={0} className={case_} />
                            </label>
                          ))}
                        </div>
                      )}
                      {couleurs.map((c) => (
                        <div key={c} className="w-fit text-sm font-medium text-gray-700">
                          {NOM_COULEUR[c]}
                          {variantes.map((v, vi) =>
                            v && !v.refs[c] ? null : (
                              <label key={vi} className="mt-1 block w-fit whitespace-nowrap text-xs font-normal text-gray-500">
                                {v ? `${v.code} - ${v.refs[c]}` : 'quantité'}
                                <input type="number" inputMode="numeric" name={`qte_${i}_${c}_${vi}`} min={0} defaultValue={0} className={case_} />
                              </label>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            ))}
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-gray-700 md:col-span-2">
                Remarque (facultatif)
                <input name="note" placeholder="ex. commande du 12/10" className={champ} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Date (facultatif)
                <input type="date" name="date" className={champ} />
              </label>
            </div>
            <Bouton className="rounded-lg px-5 py-2.5 font-semibold text-white" style={{ backgroundColor: VERT }}>
              Enregistrer l&apos;envoi
            </Bouton>
          </Formulaire>
        </section>
      )}

      {groupes.length > 0 && (
        <section className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Corriger le stock</h2>
          <p className="text-sm text-gray-500">Indiquez la quantité réelle : la différence est enregistrée comme correction.</p>
          <Formulaire action={corrigerStock} message="Stock corrigé" className="mt-4 grid gap-4 sm:grid-cols-5">
            <input type="hidden" name="clientId" value={client.id} />
            <label className="text-sm font-medium text-gray-700">
              Site · gamme
              <select name="groupe" className={champ}>
                {groupes.map((g) => (
                  <option key={g.cle} value={g.cle}>{g.site} · {g.gamme ? g.gamme.code : g.machines.map((m) => libelleMachine(m, '')).join(', ')}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Couleur
              <select name="couleur" className={champ}>
                {COULEURS.map((c) => (
                  <option key={c} value={c}>{NOM_COULEUR[c]}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Version
              <select name="variante" className={champ}>
                <option value="">Standard</option>
                {Array.from(new Set(groupes.flatMap((g) => (g.gamme ? familleDe(g.gamme).variantes.slice(1).map((v) => v.code) : [])))).map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Quantité réelle
              <input type="number" inputMode="numeric" name="quantite" min={0} defaultValue={0} required className={champ} />
            </label>
            <div className="flex items-end">
              <Bouton className="w-full rounded-lg border border-gray-300 px-5 py-2.5 font-semibold">Corriger</Bouton>
            </div>
          </Formulaire>
        </section>
      )}

      <section className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Derniers mouvements</h2>
        {mouvements.length === 0 ? (
          <p className="mt-2 text-gray-600">Aucun mouvement pour l&apos;instant.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Mouvement</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {evenements.slice(0, 25).map((e) => {
                  const note = noteDe(e.lignes)
                  const parGroupe = new Map<string, Mouvement[]>()
                  for (const l of e.lignes) parGroupe.set(l.groupe, [...(parGroupe.get(l.groupe) ?? []), l])
                  const total = e.lignes.reduce((n, l) => n + l.delta, 0)
                  const titre = e.motif === 'envoi' ? `Envoi de ${total} cartouche${total > 1 ? 's' : ''}` : ({ correction: 'Correction', changement: 'Cartouche changée' }[e.motif] ?? e.motif)
                  return (
                    <tr key={e.cle} className="border-b align-top last:border-0">
                      <td className="whitespace-nowrap py-1.5 pr-4">{formaterDate(e.date)}</td>
                      <td className="py-1.5 pr-4">
                        <span className={`font-semibold ${e.motif === 'envoi' ? 'text-green-700' : ''}`}>{titre}</span>
                        {note && <span className="text-gray-600"> — {note}</span>}
                        <ul className="mt-0.5 text-gray-600">
                          {Array.from(parGroupe.entries()).map(([groupe, lignes]) => (
                            <li key={groupe}>
                              {nomGroupe(groupe)} : {lignes.map(libLigne).join(' · ')}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-1.5 text-right">
                        <Formulaire
                          action={e.lignes.length > 1 ? supprimerEnvoi : supprimerMouvement}
                          message="Supprimé"
                          confirmation={e.lignes.length > 1 ? 'Supprimer cet envoi entier ? Le stock sera recalculé.' : 'Supprimer cette ligne ? Le stock sera recalculé.'}
                        >
                          {e.lignes.length > 1 ? <input type="hidden" name="ids" value={e.lignes.map((l) => l.id).join(',')} /> : <input type="hidden" name="id" value={e.lignes[0].id} />}
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
