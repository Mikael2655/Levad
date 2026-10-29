import Link from 'next/link'
import { compterEcheancesProches, listerContrats, type FiltreEcheance, type FiltreStatut } from '@/lib/financement/contrats'
import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { estInterne, peutImporterContrats, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import FormulaireFiltres from '../FormulaireFiltres'
import { dateFr, dureeTrimestres, euros, loyerPeriode, materielAffiche } from '../format'
import SelecteurMontant from '../SelecteurMontant'
import BadgeStatutContrat from './BadgeStatutContrat'

export const dynamic = 'force-dynamic'

const STATUTS: [FiltreStatut, string][] = [['en_cours', 'En cours'], ['tacite', 'Tacite'], ['cloture', 'Clôturé'], ['tous', 'Tous']]
const ECHEANCES: [FiltreEcheance, string][] = [['toutes', 'Toutes'], ['proche6', 'Échéance < 6 mois'], ['proche12', 'Échéance < 12 mois']]

interface Params { s?: string; e?: string; f?: string; c?: string; q?: string; m?: string }

export default async function PageContrats({ searchParams }: { searchParams: Params }) {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const reel = peutVoirBaremeReel(u)
  const modeMontant = reel && searchParams.m === 'reel' ? 'reel' : 'commercial'
  const statut = STATUTS.some(([v]) => v === searchParams.s) ? (searchParams.s as FiltreStatut) : 'en_cours'
  const echeance = ECHEANCES.some(([v]) => v === searchParams.e) ? (searchParams.e as FiltreEcheance) : 'toutes'
  const [contrats, proches, financeurs, utilisateurs] = await Promise.all([
    listerContrats(u, { statut, echeance, financeurId: Number(searchParams.f) || undefined, commercialId: interne ? Number(searchParams.c) || undefined : undefined, q: searchParams.q }),
    compterEcheancesProches(u),
    listerFinanceurs(),
    interne ? listerUtilisateurs() : Promise.resolve([]),
  ])
  const commerciaux = utilisateurs.filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN'))
  const champ = 'border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white'

  return (
    <main id="zone-montant" data-m={modeMontant} className="max-w-[96rem] mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">Contrats</h1>
        {peutImporterContrats(u) && <Link href="/financement/contrats/import" className="ml-auto border border-gray-300 bg-white rounded-xl px-4 py-2 text-sm font-medium">Importer des contrats</Link>}
      </div>

      {proches > 0 && echeance !== 'proche6' && (
        <Link href="/financement/contrats?e=proche6" data-garde-m className="block bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 text-sm text-orange-900">
          <b>{proches} contrat{proches > 1 ? 's arrivent' : ' arrive'} à échéance dans les 6 prochains mois</b> — des opportunités de renouvellement. Voir la liste →
        </Link>
      )}

      <FormulaireFiltres className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-3 flex flex-wrap items-end gap-3 text-sm">
        <label>Statut<br /><select name="s" defaultValue={statut} className={champ}>{STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Échéance<br /><select name="e" defaultValue={echeance} className={champ}>{ECHEANCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Financeur<br /><select name="f" defaultValue={searchParams.f ?? ''} className={champ}><option value="">Tous</option>{financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
        {interne && <label>Commercial<br /><select name="c" defaultValue={searchParams.c ?? ''} className={champ}><option value="">Tous</option>{commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}</select></label>}
        {reel && <SelecteurMontant initial={modeMontant} />}
        <label>Client<br /><input type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder="Nom du client" autoComplete="off" className={champ} /></label>
        <Link href="/financement/contrats" className="underline text-gray-500 pb-2">Réinitialiser</Link>
      </FormulaireFiltres>

      <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[84rem] table-fixed text-sm">
          <colgroup>
            <col className="w-32" />
            <col />
            {interne && <col className="w-28" />}
            <col className={reel ? 'w-40' : 'w-28'} />
            <col className="w-44" />
            <col className="w-32" />
            <col className="w-20" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-2.5 py-3 font-medium">Référence</th>
              <th className="px-2.5 py-3 font-medium">Client</th>
              {interne && <th className="px-2.5 py-3 font-medium">Commercial</th>}
              <th className="px-2.5 py-3 font-medium">Financeur{reel && ' · banque'}</th>
              <th className="px-2.5 py-3 font-medium">Matériel</th>
              <th className="px-2.5 py-3 font-medium text-right">Loyer</th>
              <th className="px-2.5 py-3 font-medium text-right">Durée</th>
              <th className="px-2.5 py-3 font-medium text-right">{reel ? <><span className="m-commercial">Montant (commerciaux)</span><span className="m-reel">Montant financé réel</span></> : 'Montant financé'}</th>
              <th className="px-2.5 py-3 font-medium">1er loyer</th>
              <th className="px-2.5 py-3 font-medium">Dernier loyer</th>
              <th className="px-2.5 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contrats.map(c => (
              <tr key={c.id} className={`hover:bg-gray-50 ${c.etat === 'PROCHE' && c.statutContrat === 'EN_COURS' ? 'bg-orange-50/40' : ''}`}>
                <td className="px-2.5 py-3 whitespace-nowrap truncate"><Link href={`/financement/contrats/${c.id}`} className="font-medium text-leasing-700 underline">{c.reference ?? `Contrat ${c.id}`}</Link></td>
                <td className="px-2.5 py-3 truncate" title={c.raisonSociale}>{c.raisonSociale}{c.importe && <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">importé</span>}</td>
                {interne && <td className="px-2.5 py-3 whitespace-nowrap truncate" title={c.commercialNom}>{c.commercialAffiche}</td>}
                <td className="px-2.5 py-3 truncate">{c.financeurNom}{'banque' in c && c.banque ? <span className="text-gray-500"> · {c.banque}</span> : null}</td>
                <td className="px-2.5 py-3 truncate" title={materielAffiche(c.materiel)}>{materielAffiche(c.materiel)}</td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap tabular-nums">{loyerPeriode(c.loyerCentimes, c.periodicite)}</td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap">{dureeTrimestres(c.dureeMois)}</td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap tabular-nums">{reel && 'montantReelCentimes' in c ? <><span className="m-commercial">{euros(c.montantCommercialCentimes)}</span><span className="m-reel">{euros(c.montantReelCentimes)}</span></> : euros(c.montantCommercialCentimes)}</td>
                <td className="px-2.5 py-3 whitespace-nowrap text-gray-600">{c.dateDebut ? dateFr(c.dateDebut) : '—'}</td>
                <td className="px-2.5 py-3 whitespace-nowrap text-gray-600">{c.dernierLoyer ? dateFr(c.dernierLoyer) : '—'}</td>
                <td className="px-2.5 py-3 whitespace-nowrap"><BadgeStatutContrat statut={c.statutContrat} etat={c.etat} mois={c.moisRestants} /></td>
              </tr>
            ))}
            {contrats.length === 0 && <tr><td colSpan={interne ? 11 : 10} className="p-6 text-center text-gray-400">Aucun contrat.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{contrats.length} contrat(s). Au terme, un contrat non dénoncé est prolongé tacitement d’un an.</p>
    </main>
  )
}
