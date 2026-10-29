import Link from 'next/link'
import { compterParStatut, listerDemandes, type FiltresDemandes } from '@/lib/financement/acces'
import { compterEcheancesProches } from '@/lib/financement/contrats'
import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { STATUTS, estInterne, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { libelleEtape } from '@/lib/financement/etapes'
import { LIBELLES_STATUT } from '@/lib/financement/statuts'
import BadgeStatut from './BadgeStatut'
import SelecteurMontant from './SelecteurMontant'
import FormulaireFiltres from './FormulaireFiltres'
import { dateFr, dureeTrimestres, euros, loyerPeriode } from './format'

export const dynamic = 'force-dynamic'

interface Params { statut?: string; f?: string; c?: string; du?: string; au?: string; arch?: string; m?: string }

export default async function TableauDeBord({ searchParams }: { searchParams: Params }) {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  // Un seul montant affiché ; admin/assistante choisissent lequel (réel ou « pour les commerciaux »).
  const peutChoisir = peutVoirBaremeReel(u)
  const modeMontant = peutChoisir && searchParams.m === 'reel' ? 'reel' : 'commercial'
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
  const [demandes, compteurs, financeurs, utilisateurs, echeancesProches] = await Promise.all([
    listerDemandes(u, filtres),
    compterParStatut(u, filtres),
    listerFinanceurs(),
    interne ? listerUtilisateurs() : Promise.resolve([]),
    compterEcheancesProches(u),
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
    <main id="zone-montant" data-m={modeMontant} className="max-w-[96rem] mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">{filtres.archivees ? 'Demandes archivées' : 'Demandes en cours'}</h1>
      </div>

      {echeancesProches > 0 && (
        <Link href="/financement/contrats?e=proche6" className="block bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 text-sm text-orange-900">
          <b>{echeancesProches} contrat{echeancesProches > 1 ? 's arrivent' : ' arrive'} à échéance dans les 6 prochains mois</b> — opportunités de renouvellement. Voir →
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={lien(undefined)} data-garde-m className={`px-3 py-1.5 rounded-full text-sm border ${!filtres.statut ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}>Toutes ({total})</Link>
        {STATUTS.filter(s => compteurs[s] || filtres.statut === s).map(s => (
          <Link key={s} href={lien(s)} data-garde-m className={`px-3 py-1.5 rounded-full text-sm border ${filtres.statut === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}>
            {LIBELLES_STATUT[s]} ({compteurs[s] ?? 0})
          </Link>
        ))}
      </div>

      <FormulaireFiltres className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-wrap items-end gap-3 text-sm">
        {filtres.statut && <input type="hidden" name="statut" value={filtres.statut} />}
        <label>Financeur<br /><select name="f" defaultValue={searchParams.f ?? ''} className={champ}><option value="">Tous</option>{financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
        {interne && <label>Commercial<br /><select name="c" defaultValue={searchParams.c ?? ''} className={champ}><option value="">Tous</option>{commerciaux.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}</select></label>}
        <label>Créée du<br /><input type="date" name="du" defaultValue={searchParams.du ?? ''} className={champ} /></label>
        <label>au<br /><input type="date" name="au" defaultValue={searchParams.au ?? ''} className={champ} /></label>
        {peutChoisir && <SelecteurMontant initial={modeMontant} />}
        <label className="pb-2"><input type="checkbox" name="arch" value="1" defaultChecked={filtres.archivees} className="mr-1.5" />Archivées</label>
        <Link href="/financement" className="underline text-gray-500 pb-2">Réinitialiser</Link>
      </FormulaireFiltres>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[74rem] table-fixed text-sm">
          <colgroup>
            <col className="w-32" />
            <col />
            {interne && <col className="w-28" />}
            <col className="w-28" />
            <col className="w-44" />
            <col className="w-32" />
            <col className="w-20" />
            <col className="w-32" />
            <col className="w-40" />
            <col className="w-24" />
          </colgroup>
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-2.5 py-3 font-medium">Référence</th>
              <th className="px-2.5 py-3 font-medium">Client</th>
              {interne && <th className="px-2.5 py-3 font-medium">Commercial</th>}
              <th className="px-2.5 py-3 font-medium">Financeur</th>
              <th className="px-2.5 py-3 font-medium">Matériel</th>
              <th className="px-2.5 py-3 font-medium text-right">Loyer</th>
              <th className="px-2.5 py-3 font-medium text-right">Durée</th>
              <th className="px-2.5 py-3 font-medium text-right">{peutChoisir ? <><span className="m-commercial">Montant (commerciaux)</span><span className="m-reel">Montant financé réel</span></> : 'Montant financé'}</th>
              <th className="px-2.5 py-3 font-medium">Statut</th>
              <th className="px-2.5 py-3 font-medium">Créée le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {demandes.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-2.5 py-3 whitespace-nowrap"><Link href={`/financement/demandes/${d.id}`} className="font-medium text-brand-800 underline">{d.reference}</Link></td>
                <td className="px-2.5 py-3 truncate" title={d.raisonSociale}>{d.raisonSociale}</td>
                {interne && <td className="px-2.5 py-3 whitespace-nowrap truncate" title={d.commercialNom}>{d.commercialAffiche}</td>}
                <td className="px-2.5 py-3 truncate">{d.financeurNom}</td>
                <td className="px-2.5 py-3 truncate" title={d.materiel}>{d.materiel}</td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap tabular-nums">{loyerPeriode(d.loyerCentimes, d.periodicite)}</td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap">{dureeTrimestres(d.dureeMois)}</td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap tabular-nums">{peutChoisir && 'montantReelCentimes' in d ? <><span className="m-commercial">{euros(d.montantCommercialCentimes)}</span><span className="m-reel">{euros(d.montantReelCentimes)}</span></> : euros(d.montantCommercialCentimes)}</td>
                <td className="px-2.5 py-3"><BadgeStatut statut={d.statut} />{d.statut === 'EN_SIGNATURE' && libelleEtape(d.etapeSignature) && <span className="block text-xs text-violet-800 mt-0.5">{libelleEtape(d.etapeSignature)}</span>}</td>
                <td className="px-2.5 py-3 whitespace-nowrap text-gray-500">{dateFr(d.creeLe)}</td>
              </tr>
            ))}
            {demandes.length === 0 && <tr><td colSpan={interne ? 10 : 9} className="p-6 text-center text-gray-400">Aucune demande.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}
