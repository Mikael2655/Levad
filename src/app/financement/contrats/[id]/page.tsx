import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listerUtilisateurs } from '@/lib/financement/admin'
import { lireContrat } from '@/lib/financement/contrats'
import { peutModifierContrat, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { Ligne, TitreSection } from '../../Fiche'
import { dateFr, dureeLibelle, euros, libellePeriodicite, materielAffiche } from '../../format'
import { listerRachats } from '@/lib/financement/rachats'
import BadgeStatutContrat, { LIBELLES_STATUT_CONTRAT } from '../BadgeStatutContrat'
import BoutonDenonciation from './BoutonDenonciation'
import BoutonSupprimer from './BoutonSupprimer'
import SelecteurMontant from '../../SelecteurMontant'
import SoldeContrat from './SoldeContrat'
import FormulaireContrat from './FormulaireContrat'

export const dynamic = 'force-dynamic'

export default async function FicheContrat({ params, searchParams }: { params: { id: string }; searchParams: { m?: string } }) {
  const u = await exigerUtilisateur()
  const c = await lireContrat(u, Number(params.id))
  if (!c) notFound()
  // vueContrat renvoie ces champs exactement quand peutVoirBaremeReel est vrai
  const reel = peutVoirBaremeReel(u) ? (c as typeof c & { montantReelCentimes: number | null; banque: string | null; margeCentimes: number | null; refFinanceur: string | null; statutFinanceur: string | null }) : null
  const commerciaux = peutModifierContrat(u) ? (await listerUtilisateurs()).filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` })) : []
  const modeMontant = reel && searchParams.m === 'reel' ? 'reel' : 'commercial'
  const section = 'bg-white rounded-lg border border-gray-200 p-4 sm:p-5'
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '')

  return (
    <main id="zone-montant" data-m={modeMontant} className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/financement/contrats" className="text-sm text-gray-500 hover:text-leasing-700 bg-white border border-gray-300 rounded-md px-3 py-1 transition-colors">← Contrats</Link>
        <h1 className="text-xl font-semibold text-gray-900">{c.raisonSociale}</h1>
        <BadgeStatutContrat statut={c.statutContrat} etat={c.etat} mois={c.moisRestants} />
        {c.clotureLe && <span className="text-sm text-gray-500">clôturé le {dateFr(c.clotureLe)}{'clotureMotif' in c && c.clotureMotif ? ` (${c.clotureMotif})` : ''}</span>}
        {c.importe && <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">Importé</span>}
      </div>

      <section className={section}>
        <div className="flex flex-wrap items-end gap-3 pb-2 mb-1 border-b border-gray-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 pb-2">Contrat</h2>
          {reel && <div className="ml-auto text-sm"><SelecteurMontant initial={modeMontant} /></div>}
        </div>
        <Ligne t="Financeur">{c.financeurNom}</Ligne>
        <Ligne t="Commercial">{c.commercialNom}</Ligne>
        {c.siret && <Ligne t="SIREN / SIRET">{c.siret}</Ligne>}
        <Ligne t="Matériel">{materielAffiche(c.materiel)}</Ligne>
        <Ligne t="Loyer HT"><b>{euros(c.loyerCentimes)}</b> ({libellePeriodicite(c.periodicite)}){c.periodicite === 'MENSUELLE' && <span className="ml-2 text-xs bg-orange-100 text-orange-800 rounded px-2 py-0.5">mensuel</span>}</Ligne>
        <Ligne t="Durée">{dureeLibelle(c.dureeMois)}</Ligne>
        <Ligne t="1er loyer">{c.dateDebut ? dateFr(c.dateDebut) : <span className="text-amber-700">à renseigner</span>}</Ligne>
        <Ligne t="Dernier loyer">{c.dernierLoyer ? dateFr(c.dernierLoyer) : '—'}</Ligne>
        <Ligne t="Fin du contrat">{c.dateFin ? dateFr(c.dateFin) : '—'}{c.moisRestants !== null && c.etat !== 'ECHU' ? ` · ${c.moisRestants} mois restants` : ''}</Ligne>
        <Ligne t="Montant financé">
          {reel ? <><span className="m-commercial">{euros(c.montantCommercialCentimes)}</span><span className="m-reel">{euros(reel.montantReelCentimes)}</span></> : euros(c.montantCommercialCentimes)}
        </Ligne>
        {reel && (
          <>
            {reel.banque && <Ligne t="Banque">{reel.banque}</Ligne>}
            {reel.refFinanceur && <Ligne t="N° de contrat financeur">{reel.refFinanceur}</Ligne>}
          </>
        )}
        <Ligne t="Statut">{LIBELLES_STATUT_CONTRAT[c.statutContrat]}</Ligne>
        {c.statutContrat === 'TACITE' && c.reconduction && <Ligne t="Reconduction tacite">Prolongé d’un an : prochaine reconduction le {dateFr(c.reconduction)}{c.denonceLe ? ' — dénoncé, il s’arrêtera à cette date' : ''}</Ligne>}
        {c.denonceLe && c.statutContrat !== 'TACITE' && <Ligne t="Dénonciation">Dénoncé le {dateFr(c.denonceLe)} : le contrat s’arrête au terme</Ligne>}
        {c.demandeId && <p className="pt-2 text-sm"><Link className="underline text-leasing-700" href={`/financement/demandes/${c.demandeId}`}>Voir la demande d’origine</Link></p>}
      </section>

      {peutModifierContrat(u) && c.statutContrat !== 'CLOTURE' && <BoutonDenonciation id={c.id} denonce={!!c.denonceLe} />}

      <SoldeContrat
        contratId={c.id}
        enCours={c.statutContrat === 'EN_COURS'}
        peutEnvoyer={peutModifierContrat(u)}
        peutAnnuler
        rachats={(await listerRachats(u, c.id)).map(r => JSON.parse(JSON.stringify(r)))}
      />

      {u.role === 'ADMIN' && <BoutonSupprimer id={c.id} avecDemande={c.demandeId !== null} />}

      {peutModifierContrat(u) && (
        <FormulaireContrat id={c.id} commercialId={c.commercialId} commerciaux={commerciaux} materiel={c.materiel} refFinanceur={reel?.refFinanceur ?? ''} dateDebut={iso(c.dateDebut)} dateFin={iso(c.dateFin)} />
      )}
    </main>
  )
}
