import Link from 'next/link'
import { compterContrats, compterEcheancesProches, listerContrats, type FiltreEcheance, type FiltreStatut } from '@/lib/financement/contrats'
import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { estInterne, peutImporterContrats, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import EnteteTri from '../EnteteTri'
import FormulaireFiltres from '../FormulaireFiltres'
import { lireOrdre, trier } from '@/lib/financement/tri'
import { dateFr, dureeTrimestres, euros, loyerPeriode, materielAffiche } from '../format'
import SelecteurMontant from '../SelecteurMontant'
import BadgeStatutContrat, { LIBELLES_STATUT_CONTRAT } from './BadgeStatutContrat'

export const dynamic = 'force-dynamic'

const STATUTS: [FiltreStatut, string][] = [['en_cours', 'En cours'], ['cloture', 'Clôturé'], ['tous', 'Tous']]
const ECHEANCES: [FiltreEcheance, string][] = [['toutes', 'Toutes'], ['proche6', 'Échéance < 6 mois'], ['proche12', 'Échéance < 12 mois']]

interface Params { s?: string; e?: string; f?: string; c?: string; q?: string; m?: string; tri?: string; ordre?: string }

export default async function PageContrats({ searchParams }: { searchParams: Params }) {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const reel = peutVoirBaremeReel(u)
  const modeMontant = reel && searchParams.m === 'reel' ? 'reel' : 'commercial'
  const statut = STATUTS.some(([v]) => v === searchParams.s) ? (searchParams.s as FiltreStatut) : 'en_cours'
  const echeance = ECHEANCES.some(([v]) => v === searchParams.e) ? (searchParams.e as FiltreEcheance) : 'toutes'
  const [contrats, proches, financeurs, utilisateurs, nb] = await Promise.all([
    listerContrats(u, { statut, echeance, financeurId: Number(searchParams.f) || undefined, commercialId: interne ? Number(searchParams.c) || undefined : undefined, q: searchParams.q }),
    compterEcheancesProches(u),
    listerFinanceurs(),
    interne ? listerUtilisateurs() : Promise.resolve([]),
    compterContrats(u),
  ])
  const ordre = lireOrdre(searchParams.ordre)
  const lignes = trier(contrats, searchParams.tri, ordre, {
    reference: c => c.reference ?? '', client: c => c.raisonSociale, commercial: c => c.commercialNom,
    financeur: c => `${c.financeurNom}${'banque' in c && c.banque ? ` ${c.banque}` : ''}`, materiel: c => materielAffiche(c.materiel),
    loyer: c => c.loyerCentimes / (c.periodicite === 'MENSUELLE' ? 1 : 3), duree: c => c.dureeMois,
    montant: c => (modeMontant === 'reel' && 'montantReelCentimes' in c ? c.montantReelCentimes : c.montantCommercialCentimes),
    debut: c => c.dateDebut, dernier: c => c.dernierLoyer, statut: c => LIBELLES_STATUT_CONTRAT[c.statutContrat],
  })
  const entete = (cle: string, libelle: React.ReactNode, droite = false) => <EnteteTri cle={cle} libelle={libelle} chemin="/financement/contrats" params={searchParams as Record<string, string | undefined>} tri={searchParams.tri} ordre={ordre} droite={droite} />
  const commerciaux = utilisateurs.filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN'))
  const champ = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400 focus:border-leasing-400 transition'

  return (
    <main id="zone-montant" data-m={modeMontant} className="max-w-[96rem] mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-500 mt-1">Vos contrats de location, leurs échéances et les renouvellements à préparer.</p>
        </div>
        {peutImporterContrats(u) && <Link href="/financement/contrats/import" className="ml-auto bg-white ring-1 ring-gray-900/10 hover:bg-leasing-50 rounded-xl px-4 py-2 text-sm font-medium transition">Importer des contrats</Link>}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/financement/contrats', n: nb.enCours, t: 'Contrats en cours', icone: '📄', ton: 'bg-leasing-100 text-leasing-800' },
          { href: '/financement/contrats?e=proche6', n: nb.aRenouveler, t: 'À renouveler (< 6 mois)', icone: '🔔', ton: 'bg-orange-100 text-orange-800' },
          { href: '/financement/contrats', n: nb.tacites, t: 'dont en reconduction tacite', icone: '🔁', ton: 'bg-violet-100 text-violet-800' },
          { href: '/financement/contrats?s=cloture', n: nb.clotures, t: 'Clôturés', icone: '✅', ton: 'bg-gray-100 text-gray-700' },
        ].map(k => (
          <Link key={k.t} href={k.href} data-garde-m className="group bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${k.ton}`}>{k.icone}</span>
            <span>
              <span className="block text-2xl font-bold text-gray-900 leading-none">{k.n}</span>
              <span className="block text-xs text-gray-500 mt-1">{k.t}</span>
            </span>
          </Link>
        ))}
      </div>

      <FormulaireFiltres className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-3 flex flex-wrap items-end gap-3 text-sm">
        <label>Statut<br /><select name="s" defaultValue={statut} className={champ}>{STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Échéance<br /><select name="e" defaultValue={echeance} className={champ}>{ECHEANCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Financeur<br /><select name="f" defaultValue={searchParams.f ?? ''} className={champ}><option value="">Tous</option>{financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
        {interne && <label>Commercial<br /><select name="c" defaultValue={searchParams.c ?? ''} className={champ}><option value="">Tous</option>{commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}</select></label>}
        {reel && <SelecteurMontant initial={modeMontant} />}
        <label>Client<br /><input type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder="Nom du client" autoComplete="off" className={champ} /></label>
        {searchParams.tri && <><input type="hidden" name="tri" value={searchParams.tri} /><input type="hidden" name="ordre" value={ordre} /></>}
        <Link href="/financement/contrats" className="underline text-gray-500 pb-2">Réinitialiser</Link>
      </FormulaireFiltres>

      <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[92rem] table-fixed text-sm">
          <colgroup>
            <col className="w-40" />
            <col className="w-64" />
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
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50/70 border-b border-gray-100">
              {entete('reference', 'Référence')}
              {entete('client', 'Client')}
              {interne && entete('commercial', 'Commercial')}
              {entete('financeur', <>Financeur{reel && ' · banque'}</>)}
              {entete('materiel', 'Matériel')}
              {entete('loyer', 'Loyer', true)}
              {entete('duree', 'Durée', true)}
              {entete('montant', reel ? <><span className="m-commercial">Montant (commerciaux)</span><span className="m-reel">Montant financé réel</span></> : 'Montant financé', true)}
              {entete('debut', '1er loyer')}
              {entete('dernier', 'Dernier loyer')}
              {entete('statut', 'Statut')}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lignes.map(c => (
              <tr key={c.id} className={`hover:bg-leasing-50/70 transition-colors ${c.etat === 'PROCHE' && c.statutContrat === 'EN_COURS' ? 'bg-orange-50/40' : ''}`}>
                <td className="px-3 py-3.5 whitespace-nowrap truncate"><Link href={`/financement/contrats/${c.id}`} className="font-medium text-leasing-700 underline">{c.reference ?? `Contrat ${c.id}`}</Link></td>
                <td className="px-3 py-3.5" title={c.raisonSociale}><span className="line-clamp-2 break-words">{c.raisonSociale}</span>{c.importe && <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">importé</span>}</td>
                {interne && <td className="px-3 py-3.5 whitespace-nowrap truncate" title={c.commercialNom}>{c.commercialAffiche}</td>}
                <td className="px-3 py-3.5 truncate">{c.financeurNom}{'banque' in c && c.banque ? <span className="text-gray-500"> · {c.banque}</span> : null}</td>
                <td className="px-3 py-3.5 truncate" title={materielAffiche(c.materiel)}>{materielAffiche(c.materiel)}</td>
                <td className="px-3 py-3.5 text-right whitespace-nowrap tabular-nums">{loyerPeriode(c.loyerCentimes, c.periodicite)}</td>
                <td className="px-3 py-3.5 text-right whitespace-nowrap">{dureeTrimestres(c.dureeMois)}</td>
                <td className="px-3 py-3.5 text-right whitespace-nowrap tabular-nums">{reel && 'montantReelCentimes' in c ? <><span className="m-commercial">{euros(c.montantCommercialCentimes)}</span><span className="m-reel">{euros(c.montantReelCentimes)}</span></> : euros(c.montantCommercialCentimes)}</td>
                <td className="px-3 py-3.5 whitespace-nowrap text-gray-600">{c.dateDebut ? dateFr(c.dateDebut) : '—'}</td>
                <td className="px-3 py-3.5 whitespace-nowrap text-gray-600">{c.dernierLoyer ? dateFr(c.dernierLoyer) : '—'}</td>
                <td className="px-3 py-3.5 whitespace-nowrap"><BadgeStatutContrat statut={c.statutContrat} etat={c.etat} mois={c.moisRestants} /></td>
              </tr>
            ))}
            {contrats.length === 0 && (
              <tr><td colSpan={interne ? 11 : 10} className="p-12 text-center">
                <p className="text-4xl mb-2">📄</p>
                <p className="font-medium text-gray-700">Aucun contrat ne correspond</p>
                <p className="text-sm text-gray-400 mt-1">Modifiez les filtres, ou attendez qu’une demande soit signée : elle deviendra un contrat.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{contrats.length} contrat(s). Au terme, un contrat non dénoncé est prolongé tacitement d’un an.</p>
    </main>
  )
}
