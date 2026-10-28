import { libelleMachine } from '@/lib/connect/libelle'
import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { avecEncres } from '@/lib/connect/releves'
import { PreparationEnvoi, type PlanEnvoi } from '@/components/connect/PreparationEnvoi'
import { MinimumEdition } from '@/components/connect/MinimumEdition'
import { Encres, VERT, formaterDate, depuis, type Encre } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR, detailsParGroupe, etatsParMachine, minimumDuGroupe, minimumsParGroupe, seuilDe, stockDuGroupe, stocksParGroupe } from '@/lib/connect/alertes'
import { FAMILLES, GAMME_AUTRES, familleDe, grouper } from '@/lib/connect/gammes'
import { ajouterEnvoi, choisirGamme, corrigerStock, definirStockMinimum, supprimerEnvoi, supprimerMouvement } from '../../actions'

const champ = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2'

export async function StockClient({ clientId }: { clientId: number }) {
  const client = await prisma.connectClient.findUnique({
    where: { id: clientId },
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
    const valeurs: PlanEnvoi['valeurs'] = {}
    const aChoisir: string[] = []
    groupes.forEach((g, i) => {
      const variantes = g.gamme ? familleDe(g.gamme).variantes : [null]
      for (const c of COULEURS) {
        const etat = (m: (typeof g.machines)[number]) => (etats.get(m.id) ?? []).find((x) => x.couleur === c)
        const enAlerte = g.machines.filter((m) => etat(m)?.alerte)
        const anticipees = avec
          ? g.machines.filter((m) => {
              const e = etat(m)
              return Boolean(e) && !e!.alerte && e!.pourcent !== null && e!.pourcent <= e!.seuil + 10 && e!.stock <= e!.minimum
            })
          : []
        const concernees = [...enAlerte, ...anticipees]
        if (concernees.length === 0) continue
        const possibles = variantes.map((v, vi) => (v === null || v.refs[c] ? vi : -1)).filter((vi) => vi >= 0)
        if (possibles.length === 0) continue
        if (possibles.length === 1) {
          valeurs[`qte_${i}_${c}_${possibles[0]}`] = { q: concernees.length, type: enAlerte.length > 0 ? 'alerte' : 'anticipation' }
        } else {
          aChoisir.push(`${NOM_COULEUR[c]} · ${g.site} · ${concernees.map((m) => libelleMachine(m, 'machine').split(' / ').pop()).join(' + ')} : ${possibles.map((vi) => variantes[vi]!.code).join(' ou ')}`)
        }
      }
    })
    return { valeurs, nb: Object.values(valeurs).reduce((n, v) => n + v.q, 0), aChoisir }
  }
  const planSans = plan(false)
  const planAvec = plan(true)

  // Derniers mouvements : les lignes d'un même envoi (même date et même fournisseur) sont regroupées ; deux envois du même jour chez des fournisseurs différents restent séparés.
  type Mouvement = (typeof mouvements)[number]
  const evenements: { cle: string; date: Date; motif: string; lignes: Mouvement[] }[] = []
  for (const m of mouvements) {
    const cle = m.motif === 'envoi' ? `envoi|${m.date.getTime()}|${m.fournisseurs ?? ''}` : `m${m.id}`
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
      {groupes.length === 0 && <p className="mt-6 rounded-xl border bg-white p-6 text-gray-600">Aucune machine suivie pour ce client.</p>}

      {groupes.filter((g) => !g.gamme && !g.machines.every((m) => m.gamme === GAMME_AUTRES)).map((g) => (
        <div key={g.cle} className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            {g.site} : gamme d&apos;encre non reconnue, ce stock est propre à la machine. Choisissez sa gamme pour le partager avec les machines compatibles du site.
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
      ))}

      {groupes.length > 0 && (
        <div id="envoi" className="scroll-mt-4">
          <Formulaire action={ajouterEnvoi} message="Envoi enregistré" reinitialiser className="mt-4">
            <input type="hidden" name="clientId" value={client.id} />
            <PreparationEnvoi sans={planSans} avec={planAvec} />
            <div className="mt-3 space-y-3 overflow-x-auto">
              {groupes.map((g, i) => {
                const variantes = g.gamme ? familleDe(g.gamme).variantes : []
                const varsEnvoi = g.gamme ? variantes : [null]
                const couleurs: string[] = variantes.length ? COULEURS.filter((c) => variantes.some((v) => v.refs[c])) : [...COULEURS]
                const stock = stockDuGroupe(stocks, client.id, g.cle)
                const minimum = minimumDuGroupe(minimums, client.id, g.cle)
                // cases aussi larges que leur texte de référence (« C-EXV 49 - 8524B002 »)
                const laCase = 'mt-0.5 block w-0 min-w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm'
                const ligne = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(0,4fr)] items-center gap-3 px-4'
                return (
                  <section key={g.cle} className="min-w-[44rem] overflow-hidden rounded-xl border bg-white">
                    <input type="hidden" name={`groupe_${i}`} value={g.cle} />
                    <div className="border-b bg-gray-50 px-4 py-1.5 text-sm font-bold">
                      {g.site} · {g.gamme ? `${variantes.map((v) => v.code).join(' / ')} (${g.gamme.modeles})` : g.machines.every((m) => m.gamme === GAMME_AUTRES) ? 'Autres' : 'gamme non reconnue'}
                    </div>
                    <div className="divide-y">
                      {g.machines.map((m) => {
                        const r = m.releves[0]
                        const re = avecEncres(m.releves)
                        const autres = g.machines.filter((x) => x.id !== m.id)
                        return (
                          <div key={m.id} className={`${ligne} py-2`}>
                            <div>
                              <Link href={`/parc/machine/${m.id}`} className="text-sm font-semibold hover:underline">{libelleMachine(m, 'Machine inconnue')}</Link>
                              <p className="text-xs text-gray-500">{r ? `Relevé ${depuis(r.date)}` : 'Jamais lu'}</p>
                              {autres.length > 0 && <p className="text-xs text-gray-500">Stock partagé avec {autres.map((x) => libelleMachine(x, 'machine').split(' / ').pop()).join(' et ')}</p>}
                            </div>
                            <Encres
                              encres={(re?.encres ?? []) as unknown as Encre[]}
                              seuils={Object.fromEntries(COULEURS.map((c) => [c, seuilDe(m, c)]))}
                              etats={Object.fromEntries((etats.get(m.id) ?? []).map((x) => [x.couleur, { bas: x.bas, jours: x.jours, mode: x.mode, alerte: x.alerte }]))}
                              stock={stock}
                              afficherStock
                            />
                          </div>
                        )
                      })}
                      <div className={`${ligne} py-1.5`}>
                        <MinimumEdition clientId={client.id} groupe={g.cle} valeurs={minimum} couleurs={couleurs} />
                      </div>
                      <div className={`${ligne} bg-gray-50 py-2`}>
                        <div className="w-fit text-xs text-gray-600">
                          <p className="font-semibold">Envoi</p>
                          {couleurs.length > 1 &&
                            varsEnvoi.map((v, vi) => (
                              <label key={vi} className="mt-0.5 block w-fit whitespace-nowrap">
                                {v ? `Jeu complet ${v.code}` : 'Jeu complet'}
                                <input type="number" inputMode="numeric" name={`jeu_${i}_${vi}`} min={0} defaultValue={0} className={laCase} />
                              </label>
                            ))}
                        </div>
                        <div className="grid grid-cols-4 items-start gap-2">
                          {COULEURS.map((c) =>
                            couleurs.includes(c) ? (
                              <div key={c} className="w-fit text-xs text-gray-500">
                                {varsEnvoi.map((v, vi) =>
                                  v && !v.refs[c] ? null : (
                                    <label key={vi} className="mb-1 block w-fit whitespace-nowrap">
                                      {v ? `${v.code} - ${v.refs[c]}` : `${NOM_COULEUR[c]} (quantité)`}
                                      <input type="number" inputMode="numeric" name={`qte_${i}_${c}_${vi}`} min={0} defaultValue={0} className={laCase} />
                                    </label>
                                  ),
                                )}
                              </div>
                            ) : (
                              <div key={c} />
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
            <div className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 rounded-xl border bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur">
              <label className="text-xs font-medium text-gray-600">
                Remarque
                <input name="note" placeholder="ex. commande du 12/10" className="mt-0.5 block w-52 rounded-md border border-gray-300 px-2 py-1 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Date
                <input type="date" name="date" className="mt-0.5 block rounded-md border border-gray-300 px-2 py-1 text-sm" />
              </label>
              <label className="flex items-center gap-1.5 pb-1.5 text-sm text-gray-700">
                <input type="checkbox" name="carol" className="h-4 w-4" /> Carol
              </label>
              <label className="flex items-center gap-1.5 pb-1.5 text-sm text-gray-700">
                <input type="checkbox" name="copyclic" className="h-4 w-4" /> Copyclic
              </label>
              <Bouton className="rounded-lg px-5 py-2 text-sm font-semibold text-white" style={{ backgroundColor: VERT }}>
                Enregistrer l&apos;envoi
              </Bouton>
            </div>
          </Formulaire>
        </div>
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
        <h2 className="text-lg font-bold">Derniers envois et mouvements de stock</h2>
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
                        {e.lignes[0].fournisseurs && <span className="text-gray-700"> — {e.lignes[0].fournisseurs}</span>}
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
