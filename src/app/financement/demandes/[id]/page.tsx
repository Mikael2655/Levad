import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lireDemande } from '@/lib/financement/acces'
import { peutAnnuler, peutArchiver, peutModifier, peutSupprimer, peutVoirBaremeReel } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { LIBELLES_STATUT, peutEnvoyerEnSignature, statutsAccessibles } from '@/lib/financement/statuts'
import BadgeStatut from '../../BadgeStatut'
import { dateHeureFr, dureeLibelle, euros, libellePeriodicite, pourcentCoef } from '../../format'
import ActionsDemande from './ActionsDemande'

export const dynamic = 'force-dynamic'

const Ligne = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="flex gap-3 py-1 text-sm"><span className="w-44 shrink-0 text-gray-500">{t}</span><span className="text-gray-900">{children}</span></div>
)

export default async function FicheDemande({ params }: { params: { id: string } }) {
  const u = await exigerUtilisateur()
  const d = await lireDemande(u, Number(params.id))
  if (!d) notFound()
  const reel = peutVoirBaremeReel(u) && 'montantReelCentimes' in d ? d : null
  const section = 'bg-white rounded-2xl border border-gray-200 p-4 sm:p-5'

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/financement" className="text-sm text-gray-500 underline">← Demandes</Link>
        <h1 className="text-xl font-bold text-gray-900">{d.reference} · {d.raisonSociale}</h1>
        <BadgeStatut statut={d.statut} />
        {d.archivee && <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">Archivée</span>}
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
        peutSignature={peutEnvoyerEnSignature(u, d)}
        signataires={{
          client: { prenom: d.contactPrenom, nom: d.contactNom, email: d.contactEmail },
          fournisseur: { prenom: u.prenom, nom: u.nom, email: u.email },
        }}
      />

      <section className={section}>
        <h2 className="font-semibold text-gray-900 mb-2">Client</h2>
        <Ligne t="Raison sociale">{d.raisonSociale}{d.formeJuridique ? ` (${d.formeJuridique})` : ''}</Ligne>
        <Ligne t="SIREN / SIRET">{d.siret || <span className="text-amber-700">à renseigner</span>}</Ligne>
        <Ligne t="Adresse">{[d.adresse, [d.codePostal, d.ville].filter(Boolean).join(' '), d.pays].filter(Boolean).join(', ')}</Ligne>
        <Ligne t="Contact">{d.contactPrenom} {d.contactNom} · {d.contactEmail}{d.contactTel ? ` · ${d.contactTel}` : ''}</Ligne>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-gray-900 mb-2">Financement</h2>
        <Ligne t="Financeur">{d.financeurNom}</Ligne>
        <Ligne t="Commercial">{d.commercialNom}{d.saisiParNom !== d.commercialNom ? ` (saisie par ${d.saisiParNom})` : ''}</Ligne>
        <Ligne t="Durée / périodicité">{dureeLibelle(d.dureeMois)} · {libellePeriodicite(d.periodicite)}</Ligne>
        <Ligne t="Loyer HT"><b>{euros(d.loyerCentimes)}</b> par {d.periodicite === 'MENSUELLE' ? 'mois' : 'trimestre'}</Ligne>
        <Ligne t="Montant (barème commercial)">{euros(d.montantCommercialCentimes)} <span className="text-gray-400">— coefficient {pourcentCoef(d.coefficientCommercialPpm)}</span></Ligne>
        {reel && (
          <>
            <Ligne t="Montant financé réel">{euros(reel.montantReelCentimes)} <span className="text-gray-400">— coefficient {pourcentCoef(reel.coefficientReelPpm)}</span></Ligne>
            <Ligne t="Marge"><b className="text-emerald-700">{euros(reel.margeCentimes)}</b></Ligne>
            {reel.horsTranche && <p className="text-sm text-amber-800 mt-1">⚠ Montant hors des tranches du barème : calcul approximatif.</p>}
            {reel.refFinanceur && <Ligne t="N° de dossier financeur">{reel.refFinanceur}</Ligne>}
          </>
        )}
      </section>

      <section className={section}>
        <h2 className="font-semibold text-gray-900 mb-2">Matériel et prestations</h2>
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
          <h2 className="font-semibold text-gray-900 mb-2">Signataires</h2>
          <Ligne t="Client">{d.signature.clientPrenom} {d.signature.clientNom} · {d.signature.clientEmail}</Ligne>
          <Ligne t="LEVAD">{d.signature.fournisseurPrenom} {d.signature.fournisseurNom} · {d.signature.fournisseurEmail}</Ligne>
        </section>
      )}

      <section className={section}>
        <h2 className="font-semibold text-gray-900 mb-2">Pièces jointes</h2>
        <p className="text-sm text-gray-500">L’envoi des pièces (Kbis, bilans, RIB…) sera ajouté à une prochaine étape. En attendant, transmettez-les par e-mail.</p>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-gray-900 mb-2">Historique</h2>
        <ul className="space-y-2 text-sm">
          {[...d.historique].reverse().map(h => (
            <li key={h.id} className="flex flex-wrap gap-x-3">
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
