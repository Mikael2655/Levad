import Link from 'next/link'
import { compterContrats, compterEcheancesProches, listerContrats, type FiltreEcheance, type FiltreStatut } from '@/lib/financement/contrats'
import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { estInterne, peutImporterContrats, peutModifierContrat, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import EnteteTri from '../EnteteTri'
import Indicateur from '../Indicateur'
import FormulaireFiltres from '../FormulaireFiltres'
import { lireOrdre, trier } from '@/lib/financement/tri'
import { dateFr, dureeTrimestres, euros, loyerPeriode, materielAffiche } from '../format'
import SelecteurMontant from '../SelecteurMontant'
import BarreAttribution from './BarreAttribution'
import BadgeStatutContrat, { LIBELLES_STATUT_CONTRAT } from './BadgeStatutContrat'

export const dynamic = 'force-dynamic'

const STATUTS: [FiltreStatut, string][] = [['en_cours', 'En cours'], ['cloture', 'Clôturé'], ['tous', 'Tous']]
const ECHEANCES: [FiltreEcheance, string][] = [['toutes', 'Toutes'], ['proche6', 'Échéance < 6 mois'], ['proche12', 'Échéance < 12 mois']]

interface Params { s?: string; e?: string; f?: string; c?: string; q?: string; m?: string; tri?: string; ordre?: string }

export default async function PageContrats({ searchParams }: { searchParams: Params }) {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const reel = peutVoirBaremeReel(u)
  const peutAttribuer = peutModifierContrat(u)
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
  const champ = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition'

  return (
    <main id="zone-montant" data-m={modeMontant} className="max-w-[96rem] mx-auto p-4 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Contrats</h1>
          <p className="text-sm text-gray-500 mt-1">Contrats de location, échéances et renouvellements à préparer.</p>
        </div>
        {peutImporterContrats(u) && <Link href="/financement/contrats/import" className="ml-auto bg-white border border-gray-300 hover:bg-gray-50 rounded-xl px-4 py-2 text-sm font-medium transition">Importer des contrats</Link>}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Indicateur href="/financement/contrats" n={nb.enCours} titre="Contrats en cours" icone="contrat" ton="vert" />
        <Indicateur href="/financement/contrats?e=proche6" n={nb.aRenouveler} titre="À renouveler (< 6 mois)" icone="cloche" ton="orange" />
        <Indicateur href="/financement/contrats" n={nb.tacites} titre="dont en reconduction tacite" icone="cycle" ton="ciel" />
        <Indicateur href="/financement/contrats?s=cloture" n={nb.clotures} titre="Clôturés" icone="coche" ton="gris" />
      </div>

      <FormulaireFiltres className="carte p-3 flex flex-wrap items-end gap-3 text-sm">
        <label>Statut<br /><select name="s" defaultValue={statut} className={champ}>{STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Échéance<br /><select name="e" defaultValue={echeance} className={champ}>{ECHEANCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Financeur<br /><select name="f" defaultValue={searchParams.f ?? ''} className={champ}><option value="">Tous</option>{financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
        {interne && <label>Commercial<br /><select name="c" defaultValue={searchParams.c ?? ''} className={champ}><option value="">Tous</option>{commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}</select></label>}
        {reel && <SelecteurMontant initial={modeMontant} />}
        <label>Client<br /><input type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder="Nom du client" autoComplete="off" className={champ} /></label>
        {searchParams.tri && <><input type="hidden" name="tri" value={searchParams.tri} /><input type="hidden" name="ordre" value={ordre} /></>}
        <Link href="/financement/contrats" className="underline text-gray-500 pb-2">Réinitialiser</Link>
      </FormulaireFiltres>

      <div className="carte overflow-x-auto">
        <table className="w-full min-w-[86rem] table-fixed text-sm">
          <colgroup>
            {peutAttribuer && <col className="w-10" />}
            <col className="w-36" />
            <col className="w-56" />
            {interne && <col className="w-24" />}
            <col className="w-36" />
            <col className="w-40" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-40" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-sable-50 border-b border-black/5">
              {peutAttribuer && <th className="px-3 py-3 w-10"><input type="checkbox" data-sel-tout aria-label="Tout sélectionner" className="h-4 w-4 accent-[#08865a]" /></th>}
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
              <tr key={c.id} className={`hover:bg-sable-50 transition-colors ${c.etat === 'PROCHE' && c.statutContrat === 'EN_COURS' ? 'bg-orange-50/40' : ''}`}>
                {peutAttribuer && <td className="px-3 py-3"><input type="checkbox" data-sel-contrat value={c.id} aria-label={`Sélectionner ${c.raisonSociale}`} className="h-4 w-4 accent-[#08865a]" /></td>}
                <td className="px-3 py-3 whitespace-nowrap truncate"><Link href={`/financement/contrats/${c.id}`} className="font-medium text-accent-700 underline">{c.reference ?? `Contrat ${c.id}`}</Link></td>
                <td className="px-3 py-3" title={c.raisonSociale}><span className="line-clamp-2 break-words">{c.raisonSociale}</span>{c.importe && <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">importé</span>}</td>
                {interne && <td className="px-3 py-3 whitespace-nowrap truncate" title={c.commercialNom}>{c.commercialAffiche}</td>}
                <td className="px-3 py-3 truncate">{c.financeurNom}{'banque' in c && c.banque ? <span className="text-gray-500"> · {c.banque}</span> : null}</td>
                <td className="px-3 py-3 truncate" title={materielAffiche(c.materiel)}>{materielAffiche(c.materiel)}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{loyerPeriode(c.loyerCentimes, c.periodicite)}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap">{dureeTrimestres(c.dureeMois)}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{reel && 'montantReelCentimes' in c ? <><span className="m-commercial">{euros(c.montantCommercialCentimes)}</span><span className="m-reel">{euros(c.montantReelCentimes)}</span></> : euros(c.montantCommercialCentimes)}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-600">{c.dateDebut ? dateFr(c.dateDebut) : '—'}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-600">{c.dernierLoyer ? dateFr(c.dernierLoyer) : '—'}</td>
                <td className="px-3 py-3 whitespace-nowrap"><BadgeStatutContrat statut={c.statutContrat} etat={c.etat} mois={c.moisRestants} /></td>
              </tr>
            ))}
            {contrats.length === 0 && (
              <tr><td colSpan={(interne ? 11 : 10) + (peutAttribuer ? 1 : 0)} className="p-12 text-center">
                                <p className="font-semibold text-gray-900">Aucun contrat ne correspond</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Essaie d’autres filtres. Et dès qu’une demande est signée, elle devient un contrat et apparaît ici.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {peutAttribuer && <BarreAttribution commerciaux={commerciaux.map(c => ({ id: c.id, nom: `${c.prenom} ${c.nom}` }))} />}
      <p className="text-xs text-gray-400">{contrats.length} contrat(s). Au terme, un contrat non dénoncé est prolongé tacitement d’un an.</p>
    </main>
  )
}
