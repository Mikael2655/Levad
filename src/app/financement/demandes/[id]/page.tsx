import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lireDemande } from '@/lib/financement/acces'
import { peutAnnuler, peutArchiver, peutModifier, peutSupprimer, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { Ligne, TitreSection } from '../../Fiche'
import { purgeOpportuniste } from '@/lib/financement/pieces'
import { libelleEtape } from '@/lib/financement/etapes'
import { LIBELLES_STATUT, peutEnvoyerEnSignature, statutsAccessibles } from '@/lib/financement/statuts'
import BadgeStatut from '../../BadgeStatut'
import { dateHeureFr, dureeLibelle, euros, libellePeriodicite, pourcentCoef } from '../../format'
import ActionsDemande from './ActionsDemande'
import PiecesJointes from './PiecesJointes'

export const dynamic = 'force-dynamic'

export default async function FicheDemande({ params }: { params: { id: string } }) {
  const u = await exigerUtilisateur()
  await purgeOpportuniste()
  const d = await lireDemande(u, Number(params.id))
  if (!d) notFound()
  const reel = peutVoirBaremeReel(u) && 'montantReelCentimes' in d ? d : null
  const section = 'carte p-5 sm:p-6'

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/financement" className="text-sm text-gray-500 hover:text-accent-700 bg-white border border-gray-300 rounded-xl px-3 py-1 transition-colors">← Demandes</Link>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{d.reference} <span className="text-gray-400 font-normal">·</span> {d.raisonSociale}</h1>
        <BadgeStatut statut={d.statut} />
        {d.statut === 'EN_SIGNATURE' && libelleEtape(d.etapeSignature) && <span className="text-sm text-violet-800">{libelleEtape(d.etapeSignature)}</span>}
        {d.archivee && <span className="text-xs bg-gray-200 text-gray-600 rounded px-2 py-0.5">Archivée</span>}
      </div>
      {d.statut === 'INFOS_MANQUANTES' && d.infosManquantes && (
        <p className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-900"><b>Informations demandées par le financeur :</b> {d.infosManquantes}</p>
      )}

      <ActionsDemande
        id={d.id}
        interne={reel !== null}
        statutsAccessibles={statutsAccessibles(u, d).map(s => ({ valeur: s, libelle: LIBELLES_STATUT[s] }))}
        peutModifier={peutModifier(u, d)}
        peutArchiver={peutArchiver(u, d)}
        archivee={d.archivee}
        peutSupprimer={peutSupprimer(u)}
        peutAnnuler={peutAnnuler(u, d)}
        peutSignature={peutEnvoyerEnSignature(u, d) && d.signatureElectronique}
        saisieMontantReel={reel !== null && "sansBaremeReel" in d && d.sansBaremeReel === true}
        miseEnPlace={reel !== null && !d.signatureElectronique && d.statut === 'PRETE_A_SIGNER'}
        peutRenvoyerMail={reel !== null && d.envoiParMail && d.statut !== 'BROUILLON' && d.statut !== 'ANNULEE'}
        montantReelActuel={reel?.montantReelCentimes ?? null}
        etapeSignature={d.statut === 'EN_SIGNATURE' ? d.etapeSignature ?? '' : null}
        signataires={{
          client: { prenom: d.contactPrenom, nom: d.contactNom, email: d.contactEmail },
          fournisseur: { prenom: u.prenom, nom: u.nom, email: u.email },
        }}
      />

      <section className={section}>
        <TitreSection icone="client">Client</TitreSection>
        <Ligne t="Raison sociale">{d.raisonSociale}{d.formeJuridique ? ` (${d.formeJuridique})` : ''}</Ligne>
        <Ligne t="SIREN / SIRET">{d.siret || <span className="text-amber-700">à renseigner</span>}</Ligne>
        <Ligne t="Adresse">{[d.adresse, [d.codePostal, d.ville].filter(Boolean).join(' '), d.pays].filter(Boolean).join(', ')}</Ligne>
        {(d.contactPrenom || d.contactNom || d.contactEmail || d.contactTel) && <Ligne t="Contact">{[`${d.contactPrenom} ${d.contactNom}`.trim(), d.contactEmail, d.contactTel].filter(Boolean).join(' · ')}</Ligne>}
      </section>

      <section className={section}>
        <TitreSection icone="financement">Financement</TitreSection>
        <Ligne t="Financeur">{d.financeurNom}</Ligne>
        <Ligne t="Commercial">{d.commercialNom}{d.saisiParNom !== d.commercialNom ? ` (saisie par ${d.saisiParNom})` : ''}</Ligne>
        <Ligne t="Durée / périodicité">{dureeLibelle(d.dureeMois)} · {libellePeriodicite(d.periodicite)}{d.periodicite === 'MENSUELLE' && <span className="ml-2 text-xs bg-orange-100 text-orange-800 rounded px-2 py-0.5">paiement mensuel : coefficient majoré</span>}</Ligne>
        <Ligne t="Loyer HT"><b>{euros(d.loyerCentimes)}</b> par {d.periodicite === 'MENSUELLE' ? 'mois' : 'trimestre'}</Ligne>
        <Ligne t="Montant (barème commercial)">{euros(d.montantCommercialCentimes)} <span className="text-gray-400">— coefficient {pourcentCoef(d.coefficientCommercialPpm)}</span></Ligne>
        {d.rachat && <Ligne t="Rachat de contrat intégré"><b>{euros(d.rachat.totalCentimes)}</b> — contrat de <Link className="underline text-accent-700" href={`/financement/contrats/${d.rachat.contratId}`}>{d.rachat.contratClient}</Link> ({d.rachat.type === 'RENOUVELANT' ? 'solde renouvelant' : 'solde non renouvelant'}), compris dans le montant ci-dessus</Ligne>}
        {reel && (
          <>
            {reel.montantReelCentimes != null && <Ligne t="Montant financé réel">{euros(reel.montantReelCentimes)}{reel.coefficientReelPpm != null && <span className="text-gray-400"> — coefficient {pourcentCoef(reel.coefficientReelPpm)}</span>}</Ligne>}
            {reel.margeCentimes != null && <Ligne t="Marge"><b className="text-emerald-700">{euros(reel.margeCentimes)}</b></Ligne>}
            {reel.horsTranche && <p className="text-sm text-amber-800 mt-1">⚠ Montant hors des tranches du barème : calcul approximatif.</p>}
            {reel.refFinanceur && <Ligne t="N° de dossier financeur">{reel.refFinanceur}</Ligne>}
          </>
        )}
      </section>

      <section className={section}>
        <TitreSection icone="materiel">Matériel et prestations</TitreSection>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500"><th className="py-1 font-medium">Désignation</th><th className="font-medium">Constructeur</th><th className="font-medium text-right">Qté</th><th className="font-medium text-right">Montant HT</th></tr></thead>
          <tbody>
            {d.lignes.map(l => (
              <tr key={l.id} className="border-t border-gray-100"><td className="py-1.5">{l.designation}</td><td>{l.constructeur ?? ''}</td><td className="text-right">{l.quantite}</td><td className="text-right">{l.montantHtCentimes != null ? euros(l.montantHtCentimes) : ''}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {d.signature && (
        <section className={section}>
          <TitreSection icone="signature">Signataires</TitreSection>
          <Ligne t="Client">{d.signature.clientPrenom} {d.signature.clientNom} · {d.signature.clientEmail}</Ligne>
          <Ligne t="LEVAD">{d.signature.fournisseurPrenom} {d.signature.fournisseurNom} · {d.signature.fournisseurEmail}</Ligne>
        </section>
      )}

      <PiecesJointes financeurAvecApi={d.financeurAvecApi} demandeId={d.id} moiId={u.id} interne={reel !== null} modifiable={d.statut !== 'ANNULEE' && d.statut !== 'SIGNEE'} pieces={d.pieces.map(x => JSON.parse(JSON.stringify(x)))} />

      <section className={section}>
        <TitreSection icone="historique">Historique</TitreSection>
        <ul className="relative border-l-2 border-accent-100 ml-2 space-y-4 text-sm">
          {[...d.historique].reverse().map(h => (
            <li key={h.id} className="relative pl-6 flex flex-wrap gap-x-3 gap-y-0.5">
              <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-accent-500 ring-4 ring-white" aria-hidden />
              <span className="text-gray-400 w-32 shrink-0">{dateHeureFr(h.date)}</span>
              <span className="text-gray-700">{h.auteurNom}</span>
              {h.nouveauStatut && h.ancienStatut !== h.nouveauStatut && <span className="text-gray-900">{h.ancienStatut ? `${LIBELLES_STATUT[h.ancienStatut as keyof typeof LIBELLES_STATUT]} → ` : ''}<b>{LIBELLES_STATUT[h.nouveauStatut as keyof typeof LIBELLES_STATUT]}</b></span>}
              {h.commentaire && <span className="text-gray-500">{h.commentaire}</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
