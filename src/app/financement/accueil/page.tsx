import Link from 'next/link'
import { listerDemandes } from '@/lib/financement/acces'
import { listerContrats } from '@/lib/financement/contrats'
import { estInterne, peutVoirBaremeReel } from '@/lib/financement/droits'
import { libelleEtape } from '@/lib/financement/etapes'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { dateFr, euros } from '../format'

export const dynamic = 'force-dynamic'

// Page d'accueil : ce qui attend la personne aujourd'hui (demandes à traiter) et l'état du portefeuille de contrats.
// Lecture seule : mêmes données et mêmes droits que les listes « Demandes » et « Contrats ».

const Icone = ({ d, className = 'w-5 h-5' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d={d} /></svg>
)
const I = {
  crayon: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  signature: 'M4 17c2-4 3-9 5-9s1 6 3 6 2-3 4-3 2 3 4 3M3 21h18',
  sablier: 'M7 3h10M7 21h10M8 3v3.5a4 4 0 0 0 1.6 3.2L12 12l-1.6 1.3A4 4 0 0 0 8 16.5V21M16 3v3.5a4 4 0 0 1-1.6 3.2L12 12l1.6 1.3A4 4 0 0 1 16 16.5V21',
  refus: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM9 9l6 6M15 9l-6 6',
  contrat: 'M7 3h8l4 4v14H7V3ZM15 3v4h4M10 12h6M10 16h6',
  euro: 'M17 7a6 6 0 1 0 0 10M5 10h8M5 14h8',
  cloche: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0',
  fleche: 'm9 6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  coche: 'm5 12.5 4.5 4.5L19 7.5',
}

function il_y_a(d: Date): string {
  const jours = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  return jours <= 0 ? 'aujourd’hui' : jours === 1 ? 'hier' : `il y a ${jours} j`
}

interface Groupe {
  cle: string
  titre: string
  aide: string
  icone: string
  ton: { fond: string; puce: string; texte: string }
  statuts: string[]
  vide: string
}
const GROUPES: Groupe[] = [
  { cle: 'incomplets', titre: 'Dossiers incomplets', aide: 'Le financeur attend des pièces ou des informations.', icone: I.crayon, ton: { fond: 'bg-amber-50', puce: 'bg-amber-100 text-amber-700', texte: 'text-amber-800' }, statuts: ['INFOS_MANQUANTES'], vide: 'Aucun dossier incomplet : le financeur a tout ce qu’il lui faut.' },
  { cle: 'signature', titre: 'À signer', aide: 'Accord obtenu : lancez ou suivez la signature.', icone: I.signature, ton: { fond: 'bg-violet-50', puce: 'bg-violet-100 text-violet-700', texte: 'text-violet-800' }, statuts: ['PRETE_A_SIGNER', 'EN_SIGNATURE'], vide: 'Pas de signature en cours pour le moment.' },
  { cle: 'reponse', titre: 'En attente du financeur', aide: 'Envoyées : on attend leur réponse.', icone: I.sablier, ton: { fond: 'bg-sky-50', puce: 'bg-sky-100 text-sky-700', texte: 'text-sky-800' }, statuts: ['ENVOYEE'], vide: 'Aucune réponse en attente : tout a été traité.' },
  { cle: 'refus', titre: 'Refusés à retravailler', aide: 'Une nouvelle proposition peut débloquer le dossier.', icone: I.refus, ton: { fond: 'bg-rose-50', puce: 'bg-rose-100 text-rose-700', texte: 'text-rose-800' }, statuts: ['REFUSEE'], vide: 'Aucun refus à reprendre.' },
]
const PAR_GROUPE = 4

export default async function Accueil() {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const reel = peutVoirBaremeReel(u)
  const [demandes, contrats, proches] = await Promise.all([
    listerDemandes(u),
    listerContrats(u, { statut: 'en_cours' }),
    listerContrats(u, { statut: 'en_cours', echeance: 'proche6' }),
  ])

  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })
  const aujourdhui = jour.charAt(0).toUpperCase() + jour.slice(1)
  const parGroupe = GROUPES.map(g => ({ ...g, lignes: demandes.filter(d => g.statuts.includes(d.statut)).sort((a, b) => new Date(a.majLe).getTime() - new Date(b.majLe).getTime()) }))
  const totalActions = parGroupe.reduce((n, g) => n + g.lignes.length, 0)
  const montantTotal = contrats.reduce((n, c) => n + (c.montantCommercialCentimes ?? 0), 0)
  const montantReel = reel ? contrats.reduce((n, c) => n + (('montantReelCentimes' in c ? c.montantReelCentimes : 0) ?? 0), 0) : 0
  const carte = 'rounded-2xl bg-white border border-black/5 shadow-[0_1px_2px_rgba(60,50,20,0.04),0_8px_24px_-12px_rgba(60,50,20,0.10)]'

  return (
    <main className="min-h-screen bg-sable-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Bonjour */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">{aujourdhui}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">Bonjour {u.prenom}, voici ce qui t’attend aujourd’hui</h1>
            <p className="mt-2 text-gray-600">
              {totalActions === 0 ? 'Rien d’urgent : tes dossiers sont à jour. Profites-en pour préparer la suite !' : `${totalActions} dossier${totalActions > 1 ? 's' : ''} ${totalActions > 1 ? 'demandent' : 'demande'} ton attention.`}
            </p>
          </div>
          <Link href="/financement/demandes/nouvelle" className="inline-flex items-center gap-2 rounded-xl bg-accent-700 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-accent-800/20 transition hover:bg-accent-800">
            <Icone d={I.plus} className="h-4 w-4" />Nouvelle demande
          </Link>
        </header>

        {/* Actions à faire */}
        <section aria-labelledby="actions">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="actions" className="text-lg font-semibold text-gray-900">Actions à faire</h2>
            <Link href="/financement" className="text-sm font-medium text-accent-700 hover:underline">Toutes les demandes</Link>
          </div>
          {totalActions === 0 ? (
            <div className={`${carte} flex flex-col items-center px-6 py-14 text-center`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-600"><Icone d={I.coche} className="h-7 w-7" /></span>
              <p className="mt-4 text-lg font-semibold text-gray-900">Tout est à jour, bravo !</p>
              <p className="mt-1 max-w-md text-sm text-gray-500">Aucun dossier ne t’attend. C’est le bon moment pour lancer une nouvelle demande ou contacter un client à renouveler.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {parGroupe.map(g => (
                <div key={g.cle} className={`${carte} flex flex-col overflow-hidden`}>
                  <div className={`flex items-center gap-3 px-5 py-4 ${g.ton.fond}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${g.ton.puce}`}><Icone d={g.icone} /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">{g.titre}</h3>
                      <p className="truncate text-xs text-gray-500">{g.aide}</p>
                    </div>
                    <span className={`rounded-full bg-white px-3 py-1 text-sm font-semibold tabular-nums ${g.ton.texte}`}>{g.lignes.length}</span>
                  </div>
                  {g.lignes.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-gray-500">{g.vide}</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {g.lignes.slice(0, PAR_GROUPE).map(d => (
                        <li key={d.id}>
                          <Link href={`/financement/demandes/${d.id}`} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-sable-50">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-gray-900">{d.raisonSociale}</span>
                              <span className="block truncate text-xs text-gray-500">
                                {d.reference} · {d.statut === 'INFOS_MANQUANTES' && d.infosManquantes ? d.infosManquantes : d.statut === 'EN_SIGNATURE' ? (libelleEtape(d.etapeSignature) ?? 'signature en cours') : d.statut === 'PRETE_A_SIGNER' ? 'accord reçu, signature à lancer' : `mis à jour ${il_y_a(d.majLe)}`}
                                {interne ? ` · ${d.commercialAffiche}` : ''}
                              </span>
                            </span>
                            <span className="text-right text-sm tabular-nums text-gray-700">{euros(d.montantCommercialCentimes)}</span>
                            <Icone d={I.fleche} className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {g.lignes.length > PAR_GROUPE && (
                    <Link href={`/financement?statut=${g.statuts[0]}`} className="mt-auto border-t border-gray-100 px-5 py-3 text-sm font-medium text-accent-700 hover:bg-sable-50">Voir les {g.lignes.length} dossiers</Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contrats en cours */}
        <section aria-labelledby="contrats">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="contrats" className="text-lg font-semibold text-gray-900">Contrats en cours</h2>
            <Link href="/financement/contrats" className="text-sm font-medium text-accent-700 hover:underline">Tous les contrats</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className={`${carte} p-6`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><Icone d={I.contrat} /></span>
              <p className="mt-4 text-sm font-medium text-gray-500">Contrats en cours</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">{contrats.length}</p>
              <p className="mt-1 text-sm text-gray-500">{contrats.length === 0 ? 'Les contrats signés apparaîtront ici.' : 'dans ton portefeuille'}</p>
            </div>
            <div className={`${carte} p-6`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Icone d={I.euro} /></span>
              <p className="mt-4 text-sm font-medium text-gray-500">Montant total financé</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">{euros(montantTotal)}</p>
              <p className="mt-1 text-sm text-gray-500">{reel ? `dont ${euros(montantReel)} côté financeur` : 'sur l’ensemble des contrats en cours'}</p>
            </div>
            <div className={`${carte} p-6`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icone d={I.cloche} /></span>
              <p className="mt-4 text-sm font-medium text-gray-500">À renouveler dans les 6 mois</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">{proches.length}</p>
              <p className="mt-1 text-sm text-gray-500">{proches.length === 0 ? 'Pas d’échéance proche pour l’instant.' : 'autant d’occasions de proposer un renouvellement'}</p>
            </div>
          </div>

          <div className={`${carte} mt-5 overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-gray-100 bg-orange-50/60 px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Icone d={I.cloche} /></span>
              <div>
                <h3 className="font-semibold text-gray-900">Opportunités de renouvellement</h3>
                <p className="text-xs text-gray-500">Contrats qui arrivent bientôt à échéance : le bon moment pour appeler le client.</p>
              </div>
            </div>
            {proches.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <p className="font-medium text-gray-900">Pas d’échéance dans les 6 prochains mois</p>
                <p className="mt-1 max-w-md text-sm text-gray-500">Quand un contrat approchera de sa fin, il apparaîtra ici pour que tu puisses proposer un renouvellement à temps.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {[...proches].sort((a, b) => new Date(a.dateFin ?? 0).getTime() - new Date(b.dateFin ?? 0).getTime()).slice(0, 5).map(c => (
                  <li key={c.id}>
                    <Link href={`/financement/contrats/${c.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-sable-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-gray-900">{c.raisonSociale}</span>
                        <span className="block truncate text-xs text-gray-500">{c.reference ?? `Contrat ${c.id}`}{interne ? ` · ${c.commercialAffiche}` : ''}</span>
                      </span>
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800 ring-1 ring-inset ring-orange-600/20">{c.moisRestants} mois restant{(c.moisRestants ?? 0) > 1 ? 's' : ''} · fin le {c.dateFin ? dateFr(c.dateFin) : '—'}</span>
                      <span className="hidden text-right text-sm tabular-nums text-gray-700 sm:block">{euros(c.montantCommercialCentimes)}</span>
                      <Icone d={I.fleche} className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
