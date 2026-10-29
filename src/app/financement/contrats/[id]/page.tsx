import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listerUtilisateurs } from '@/lib/financement/admin'
import { lireContrat } from '@/lib/financement/contrats'
import { peutModifierContrat, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { dateFr, dureeLibelle, euros, libellePeriodicite } from '../../format'
import BadgeEcheance from '../BadgeEcheance'
import FormulaireContrat from './FormulaireContrat'

export const dynamic = 'force-dynamic'

const Ligne = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="flex gap-3 py-1 text-sm"><span className="w-48 shrink-0 text-gray-500">{t}</span><span className="text-gray-900">{children}</span></div>
)

export default async function FicheContrat({ params }: { params: { id: string } }) {
  const u = await exigerUtilisateur()
  const c = await lireContrat(u, Number(params.id))
  if (!c) notFound()
  // vueContrat renvoie ces champs exactement quand peutVoirBaremeReel est vrai
  const reel = peutVoirBaremeReel(u) ? (c as typeof c & { montantReelCentimes: number | null; banque: string | null; margeCentimes: number | null; refFinanceur: string | null; statutFinanceur: string | null }) : null
  const commerciaux = peutModifierContrat(u) ? (await listerUtilisateurs()).filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` })) : []
  const section = 'bg-white rounded-2xl border border-gray-200 p-4 sm:p-5'
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '')

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/financement/contrats" className="text-sm text-gray-500 underline">← Contrats</Link>
        <h1 className="text-xl font-bold text-gray-900">{c.raisonSociale}</h1>
        <BadgeEcheance etat={c.etat} mois={c.moisRestants} />
        {c.importe && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">Importé</span>}
      </div>

      <section className={section}>
        <h2 className="font-semibold text-gray-900 mb-2">Contrat</h2>
        <Ligne t="Financeur">{c.financeurNom}</Ligne>
        <Ligne t="Commercial">{c.commercialNom}</Ligne>
        {c.siret && <Ligne t="SIREN / SIRET">{c.siret}</Ligne>}
        <Ligne t="Matériel">{c.materiel}</Ligne>
        <Ligne t="Loyer HT"><b>{euros(c.loyerCentimes)}</b> ({libellePeriodicite(c.periodicite)}){c.periodicite === 'MENSUELLE' && <span className="ml-2 text-xs bg-orange-100 text-orange-800 rounded-full px-2 py-0.5">mensuel</span>}</Ligne>
        <Ligne t="Durée">{dureeLibelle(c.dureeMois)}</Ligne>
        <Ligne t="1er loyer">{c.dateDebut ? dateFr(c.dateDebut) : <span className="text-amber-700">à renseigner</span>}</Ligne>
        <Ligne t="Fin du contrat">{c.dateFin ? dateFr(c.dateFin) : '—'}{c.moisRestants !== null && c.etat !== 'ECHU' ? ` · ${c.moisRestants} mois restants` : ''}</Ligne>
        <Ligne t="Montant (barème commercial)">{euros(c.montantCommercialCentimes)}</Ligne>
        {reel && (
          <>
            <Ligne t="Montant financé réel">{euros(reel.montantReelCentimes)}</Ligne>
            {reel.banque && <Ligne t="Banque">{reel.banque}</Ligne>}
            {reel.margeCentimes !== null && <Ligne t="Marge"><b className="text-emerald-700">{euros(reel.margeCentimes)}</b></Ligne>}
            {reel.refFinanceur && <Ligne t="N° de contrat financeur">{reel.refFinanceur}</Ligne>}
            {reel.statutFinanceur && <Ligne t="Statut chez le financeur">{reel.statutFinanceur}</Ligne>}
          </>
        )}
        {c.demandeId && <p className="pt-2 text-sm"><Link className="underline text-brand-800" href={`/financement/demandes/${c.demandeId}`}>Voir la demande d’origine</Link></p>}
      </section>

      {peutModifierContrat(u) && (
        <FormulaireContrat id={c.id} commercialId={c.commercialId} commerciaux={commerciaux} materiel={c.materiel} refFinanceur={reel?.refFinanceur ?? ''} dateDebut={iso(c.dateDebut)} dateFin={iso(c.dateFin)} />
      )}
    </main>
  )
}
