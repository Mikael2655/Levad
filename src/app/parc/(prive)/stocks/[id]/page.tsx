import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Encres, VERT, formaterDate, depuis, type Encre } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR, seuilDe, stockDuGroupe, stocksParGroupe } from '@/lib/connect/alertes'
import { grouper } from '@/lib/connect/gammes'
import { ajouterEnvoi, corrigerStock } from '../../actions'

export const dynamic = 'force-dynamic'

const champ = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2'

export default async function StockClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.connectClient.findUnique({
    where: { id: Number(params.id) },
    include: {
      machines: {
        where: { categorie: 'mine', horsContrat: false },
        orderBy: [{ site: 'asc' }, { creeLe: 'asc' }],
        include: { releves: { orderBy: { date: 'desc' }, take: 1 } },
      },
    },
  })
  if (!client) notFound()
  const stocks = await stocksParGroupe()
  const groupes = grouper(client.machines)
  const mouvements = await prisma.connectStockMouvement.findMany({ where: { clientId: client.id }, orderBy: { date: 'desc' }, take: 30 })

  return (
    <>
      <Link href="/parc/stocks" className="text-sm text-gray-500 hover:text-gray-900">← Stock actuel de tous les clients</Link>
      <h1 className="mt-3 text-2xl font-bold">{client.nom}</h1>
      
      {groupes.length === 0 && <p className="mt-6 rounded-xl border bg-white p-6 text-gray-600">Aucune machine suivie pour ce client.</p>}
      {groupes.map((g) => {
        const stock = stockDuGroupe(stocks, client.id, g.cle)
        const couleursDuGroupe = g.gamme ? COULEURS.filter((c) => g.gamme!.refs[c]) : COULEURS
        return (
          <section key={g.cle} className="mt-6 rounded-xl border bg-white p-6">
            <h2 className="text-lg font-bold">
              {g.site} · {g.gamme ? `${g.gamme.code} (${g.gamme.modeles})` : 'gamme non reconnue'}
            </h2>
            {!g.gamme && (
              <p className="mt-1 text-sm text-amber-700">
                Gamme d&apos;encre non reconnue : ce stock est propre à cette machine. Choisissez sa gamme dans la fiche machine pour le partager avec les machines compatibles.
              </p>
            )}
            <div className="mt-3 divide-y">
              {g.machines.map((m) => {
                const r = m.releves[0]
                return (
                  <Link key={m.id} href={`/parc/machine/${m.id}`} className="grid items-center gap-3 py-3 hover:bg-gray-50 md:grid-cols-[1.2fr_2fr_1fr]">
                    <p className="font-semibold">{m.nomAffiche || m.modele || 'Machine inconnue'}</p>
                    <Encres
                      encres={(r?.encres ?? []) as unknown as Encre[]}
                      seuils={Object.fromEntries(COULEURS.map((c) => [c, seuilDe(m, c)]))}
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
                  {g.gamme?.refs[c] && <p className="text-xs text-gray-500">{g.gamme.refs[c]}</p>}
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {groupes.length > 0 && (
        <section className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Saisir un envoi de cartouches</h2>
          <p className="text-sm text-gray-500">Indiquez la quantité de chaque couleur envoyée (0 ou vide = aucune).</p>
          <Formulaire action={ajouterEnvoi} message="Envoi enregistré" reinitialiser className="mt-4 space-y-5">
            <input type="hidden" name="clientId" value={client.id} />
            {groupes.map((g, i) => (
              <div key={g.cle}>
                <input type="hidden" name={`groupe_${i}`} value={g.cle} />
                <p className="text-sm font-semibold text-gray-700">
                  {g.site} · {g.gamme ? g.gamme.code : g.machines.map((m) => m.nomAffiche || m.modele).join(', ')}
                </p>
                <div className="mt-1 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {(g.gamme ? COULEURS.filter((c) => g.gamme!.refs[c]) : COULEURS).map((c) => (
                    <label key={c} className="text-sm font-medium text-gray-700">
                      {NOM_COULEUR[c]}
                      {g.gamme?.refs[c] && <span className="ml-1 text-xs font-normal text-gray-400">{g.gamme.refs[c]}</span>}
                      <input type="number" inputMode="numeric" name={`qte_${i}_${c}`} min={0} defaultValue={0} className={champ} />
                    </label>
                  ))}
                </div>
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
          <Formulaire action={corrigerStock} message="Stock corrigé" className="mt-4 grid gap-4 sm:grid-cols-4">
            <input type="hidden" name="clientId" value={client.id} />
            <label className="text-sm font-medium text-gray-700">
              Site · gamme
              <select name="groupe" className={champ}>
                {groupes.map((g) => (
                  <option key={g.cle} value={g.cle}>{g.site} · {g.gamme ? g.gamme.code : g.machines.map((m) => m.nomAffiche || m.modele).join(', ')}</option>
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
                  <th className="py-2 pr-4">Site · gamme</th>
                  <th className="py-2 pr-4">Couleur</th>
                  <th className="py-2 pr-4 text-right">Quantité</th>
                  <th className="py-2">Détail</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{formaterDate(m.date)}</td>
                    <td className="py-1.5 pr-4 text-gray-600">{m.groupe ? m.groupe.replace('|', ' · ').replace(/machine-\d+/, 'machine seule') : 'Ancien stock'}</td>
                    <td className="py-1.5 pr-4">{NOM_COULEUR[m.couleur as keyof typeof NOM_COULEUR] ?? m.couleur}</td>
                    <td className={`py-1.5 pr-4 text-right tabular-nums ${m.delta > 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="py-1.5 text-gray-600">
                      {{ envoi: 'Envoi', correction: 'Correction', changement: 'Cartouche changée' }[m.motif] ?? m.motif}
                      {m.note ? ` — ${m.note}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
