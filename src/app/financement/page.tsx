import Link from 'next/link'
import { compterParStatut, listerDemandes, type FiltresDemandes } from '@/lib/financement/acces'
import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { STATUTS, estInterne, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { LIBELLES_STATUT } from '@/lib/financement/statuts'
import BadgeStatut from './BadgeStatut'
import { dateFr, dureeLibelle, euros } from './format'

export const dynamic = 'force-dynamic'

interface Params { statut?: string; f?: string; c?: string; du?: string; au?: string; arch?: string }

export default async function TableauDeBord({ searchParams }: { searchParams: Params }) {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const reel = peutVoirBaremeReel(u)
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v) : undefined)
  const au = date(searchParams.au)
  const filtres: FiltresDemandes = {
    statut: (STATUTS as readonly string[]).includes(searchParams.statut ?? '') ? searchParams.statut : undefined,
    financeurId: Number(searchParams.f) || undefined,
    commercialId: interne ? Number(searchParams.c) || undefined : undefined,
    du: date(searchParams.du),
    au: au && new Date(au.getTime() + 86_400_000 - 1),
    archivees: searchParams.arch === '1',
  }
  const [demandes, compteurs, financeurs, utilisateurs] = await Promise.all([
    listerDemandes(u, filtres),
    compterParStatut(u, filtres),
    listerFinanceurs(),
    interne ? listerUtilisateurs() : Promise.resolve([]),
  ])
  const commerciaux = utilisateurs.filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN'))
  const total = Object.values(compteurs).reduce((n, v) => n + v, 0)

  const lien = (statut?: string) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...searchParams, statut })) if (v) p.set(k, v)
    return `/financement?${p.toString()}`
  }
  const champ = 'border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white'

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">{filtres.archivees ? 'Demandes archivées' : 'Demandes de financement'}</h1>
        <Link href="/financement/demandes/nouvelle" className="ml-auto bg-brand-800 text-white rounded-xl px-4 py-2 text-sm font-semibold">+ Nouvelle demande</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={lien(undefined)} className={`px-3 py-1.5 rounded-full text-sm border ${!filtres.statut ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}>Toutes ({total})</Link>
        {STATUTS.filter(s => compteurs[s] || filtres.statut === s).map(s => (
          <Link key={s} href={lien(s)} className={`px-3 py-1.5 rounded-full text-sm border ${filtres.statut === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}>
            {LIBELLES_STATUT[s]} ({compteurs[s] ?? 0})
          </Link>
        ))}
      </div>

      <form className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-wrap items-end gap-3 text-sm" method="get">
        {filtres.statut && <input type="hidden" name="statut" value={filtres.statut} />}
        <label>Financeur<br /><select name="f" defaultValue={searchParams.f ?? ''} className={champ}><option value="">Tous</option>{financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
        {interne && <label>Commercial<br /><select name="c" defaultValue={searchParams.c ?? ''} className={champ}><option value="">Tous</option>{commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}</select></label>}
        <label>Créée du<br /><input type="date" name="du" defaultValue={searchParams.du ?? ''} className={champ} /></label>
        <label>au<br /><input type="date" name="au" defaultValue={searchParams.au ?? ''} className={champ} /></label>
        <label className="pb-2"><input type="checkbox" name="arch" value="1" defaultChecked={filtres.archivees} className="mr-1.5" />Archivées</label>
        <button className="bg-gray-900 text-white rounded-lg px-4 py-1.5">Filtrer</button>
        <Link href="/financement" className="underline text-gray-500 pb-2">Réinitialiser</Link>
      </form>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3 font-medium">Référence</th>
              <th className="p-3 font-medium">Client</th>
              {interne && <th className="p-3 font-medium">Commercial</th>}
              <th className="p-3 font-medium">Financeur</th>
              <th className="p-3 font-medium">Durée</th>
              <th className="p-3 font-medium text-right">Loyer</th>
              <th className="p-3 font-medium text-right">Montant</th>
              {reel && <th className="p-3 font-medium text-right">Montant réel</th>}
              {reel && <th className="p-3 font-medium text-right">Marge</th>}
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 font-medium">Créée le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {demandes.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap"><Link href={`/financement/demandes/${d.id}`} className="font-medium text-brand-800 underline">{d.reference}</Link></td>
                <td className="p-3">{d.raisonSociale}</td>
                {interne && <td className="p-3 whitespace-nowrap">{d.commercialNom}</td>}
                <td className="p-3">{d.financeurNom}</td>
                <td className="p-3 whitespace-nowrap">{d.dureeMois} mois</td>
                <td className="p-3 text-right whitespace-nowrap">{euros(d.loyerCentimes)}</td>
                <td className="p-3 text-right whitespace-nowrap">{euros(d.montantCommercialCentimes)}</td>
                {reel && <td className="p-3 text-right whitespace-nowrap">{'montantReelCentimes' in d ? euros(d.montantReelCentimes) : ''}</td>}
                {reel && <td className="p-3 text-right whitespace-nowrap text-emerald-700">{'margeCentimes' in d ? euros(d.margeCentimes) : ''}</td>}
                <td className="p-3"><BadgeStatut statut={d.statut} /></td>
                <td className="p-3 whitespace-nowrap text-gray-500">{dateFr(d.creeLe)}</td>
              </tr>
            ))}
            {demandes.length === 0 && <tr><td colSpan={11} className="p-6 text-center text-gray-400">Aucune demande.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}
