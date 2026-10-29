import Link from 'next/link'
import { compterEcheancesProches, listerContrats, type FiltreEcheance } from '@/lib/financement/contrats'
import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { estInterne, peutImporterContrats, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { dateFr, euros, libellePeriodicite } from '../format'
import BadgeEcheance from './BadgeEcheance'

export const dynamic = 'force-dynamic'

const ECHEANCES: [FiltreEcheance, string][] = [['en_cours', 'En cours'], ['proche6', 'Échéance < 6 mois'], ['proche12', 'Échéance < 12 mois'], ['echus', 'Échus'], ['toutes', 'Tous']]

export default async function PageContrats({ searchParams }: { searchParams: { e?: string; f?: string; c?: string; q?: string } }) {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const reel = peutVoirBaremeReel(u)
  const echeance = ECHEANCES.some(([v]) => v === searchParams.e) ? (searchParams.e as FiltreEcheance) : 'en_cours'
  const [contrats, proches, financeurs, utilisateurs] = await Promise.all([
    listerContrats(u, { echeance, financeurId: Number(searchParams.f) || undefined, commercialId: interne ? Number(searchParams.c) || undefined : undefined, q: searchParams.q }),
    compterEcheancesProches(u),
    listerFinanceurs(),
    interne ? listerUtilisateurs() : Promise.resolve([]),
  ])
  const commerciaux = utilisateurs.filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN'))
  const champ = 'border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white'

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">Contrats en cours</h1>
        {peutImporterContrats(u) && <Link href="/financement/contrats/import" className="ml-auto border border-gray-300 bg-white rounded-xl px-4 py-2 text-sm font-medium">Importer des contrats</Link>}
      </div>

      {proches > 0 && echeance !== 'proche6' && (
        <Link href="/financement/contrats?e=proche6" className="block bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 text-sm text-orange-900">
          <b>{proches} contrat{proches > 1 ? 's arrivent' : ' arrive'} à échéance dans les 6 prochains mois</b> — des opportunités de renouvellement. Voir la liste →
        </Link>
      )}

      <form method="get" className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-wrap items-end gap-3 text-sm">
        <label>Échéance<br /><select name="e" defaultValue={echeance} className={champ}>{ECHEANCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Financeur<br /><select name="f" defaultValue={searchParams.f ?? ''} className={champ}><option value="">Tous</option>{financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
        {interne && <label>Commercial<br /><select name="c" defaultValue={searchParams.c ?? ''} className={champ}><option value="">Tous</option>{commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}</select></label>}
        <label>Client<br /><input name="q" defaultValue={searchParams.q ?? ''} placeholder="Nom du client" className={champ} /></label>
        <button className="bg-gray-900 text-white rounded-lg px-4 py-1.5">Filtrer</button>
        <Link href="/financement/contrats" className="underline text-gray-500 pb-2">Réinitialiser</Link>
      </form>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3 font-medium">Client</th>
              {interne && <th className="p-3 font-medium">Commercial</th>}
              <th className="p-3 font-medium">Financeur</th>
              <th className="p-3 font-medium">Matériel</th>
              <th className="p-3 font-medium text-right">Loyer</th>
              <th className="p-3 font-medium">1er loyer</th>
              <th className="p-3 font-medium">Fin</th>
              <th className="p-3 font-medium">Échéance</th>
              <th className="p-3 font-medium text-right">Montant</th>
              {reel && <th className="p-3 font-medium text-right">Montant réel</th>}
              {reel && <th className="p-3 font-medium">Banque</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contrats.map(c => (
              <tr key={c.id} className={`hover:bg-gray-50 ${c.etat === 'PROCHE' ? 'bg-orange-50/40' : ''}`}>
                <td className="p-3"><Link href={`/financement/contrats/${c.id}`} className="font-medium text-brand-800 underline">{c.raisonSociale}</Link>{'statutFinanceur' in c && c.statutFinanceur && c.statutFinanceur !== 'RunningContract' && <span className="ml-2 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{c.statutFinanceur}</span>}</td>
                {interne && <td className="p-3 whitespace-nowrap">{c.commercialNom}</td>}
                <td className="p-3">{c.financeurNom}</td>
                <td className="p-3 max-w-[16rem] truncate" title={c.materiel}>{c.materiel}</td>
                <td className="p-3 text-right whitespace-nowrap">{euros(c.loyerCentimes)}<span className="text-gray-400"> /{c.periodicite === 'MENSUELLE' ? 'mois' : 'trim.'}</span></td>
                <td className="p-3 whitespace-nowrap text-gray-600">{c.dateDebut ? dateFr(c.dateDebut) : '—'}</td>
                <td className="p-3 whitespace-nowrap text-gray-600">{c.dateFin ? dateFr(c.dateFin) : '—'}</td>
                <td className="p-3 whitespace-nowrap"><BadgeEcheance etat={c.etat} mois={c.moisRestants} /></td>
                <td className="p-3 text-right whitespace-nowrap">{euros(c.montantCommercialCentimes)}</td>
                {reel && <td className="p-3 text-right whitespace-nowrap">{'montantReelCentimes' in c ? euros(c.montantReelCentimes) : ''}</td>}
                {reel && <td className="p-3 whitespace-nowrap">{'banque' in c ? c.banque ?? '—' : ''}</td>}
              </tr>
            ))}
            {contrats.length === 0 && <tr><td colSpan={11} className="p-6 text-center text-gray-400">Aucun contrat.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{contrats.length} contrat(s) · périodicité du loyer : {libellePeriodicite('TRIMESTRIELLE')} ou mensuelle selon le contrat.</p>
    </main>
  )
}
