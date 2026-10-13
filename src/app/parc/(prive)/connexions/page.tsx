import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Badge, depuis, formaterDate } from '@/components/connect/affichage'
import { erreurEnCours, statutConnexion } from '@/lib/connect/agent'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { RechercheConnexions } from '@/components/connect/RechercheConnexions'
import { retirerPoste } from '../actions'

export const dynamic = 'force-dynamic'

const ORDRE = { deconnecte: 0, jamais: 1, inactif: 2, connecte: 3, manuel: 4 } as const

type Ligne = { posteId?: number; erreur?: string | null; version?: string | null; cle: string; clientId: number; client: string; poste: string | null; site: string | null; derniere: Date | null; statut: keyof typeof ORDRE }

export default async function ConnexionsPage() {
  let clients
  try {
    clients = await prisma.connectClient.findMany({ include: { postes: { orderBy: [{ site: 'asc' }, { nom: 'asc' }] } } })
  } catch {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">La base de données n&apos;est pas encore prête.</p>
  }
  const lignes: Ligne[] = clients.flatMap((c): Ligne[] => {
    if (c.modeReleve === 'manuel') return [{ cle: `c${c.id}`, clientId: c.id, client: c.nom, poste: null, site: null, derniere: null, statut: 'manuel' }]
    if (c.postes.length === 0) return [{ cle: `c${c.id}`, clientId: c.id, client: c.nom, poste: null, site: null, derniere: null, statut: 'jamais' }]
    return c.postes.map((p) => ({
      cle: `p${p.id}`,
      posteId: p.id,
      clientId: c.id,
      client: c.nom,
      poste: p.nom,
      site: p.site,
      derniere: p.derniereConnexion,
      statut: statutConnexion(p.derniereConnexion, c.seuilDeconnexionJours),
      version: p.versionAgent,
      erreur: p.derniereErreur && p.derniereErreurLe && erreurEnCours(p) && Date.now() - p.derniereErreurLe.getTime() < 24 * 3600 * 1000 ? `${p.derniereErreur} (${formaterDate(p.derniereErreurLe)})` : null,
    }))
  })
  // Un seul affichage par client et par site : l'ordinateur au signal le plus récent, les autres se déroulent avec la flèche.
  type Groupe = { cle: string; tete: Ligne; autres: Ligne[]; ordre: number }
  const parCle = new Map<string, Ligne[]>()
  for (const l of lignes) {
    const cle = l.poste ? `${l.clientId}|${l.site}` : l.cle
    parCle.set(cle, [...(parCle.get(cle) ?? []), l])
  }
  const groupes: Groupe[] = Array.from(parCle.entries()).map(([cle, liste]) => {
    const triees = [...liste].sort((a, b) => (b.derniere?.getTime() ?? 0) - (a.derniere?.getTime() ?? 0))
    return { cle, tete: triees[0], autres: triees.slice(1), ordre: Math.min(...liste.map((x) => ORDRE[x.statut])) }
  })
  // ordre alphabétique des clients, puis des sites
  const alpha = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' })
  groupes.sort((a, b) => alpha(a.tete.client, b.tete.client) || alpha(a.tete.site ?? '', b.tete.site ?? ''))
  const NOM_STATUT = { connecte: 'connecté', inactif: 'pas de signal récent', deconnecte: 'déconnecté', manuel: 'relevés manuels', jamais: 'pas encore installé' }
  const texteDe = (g: Groupe) => [g.tete, ...g.autres].map((l) => `${l.client} ${l.site ?? ''} ${l.poste ?? ''} ${NOM_STATUT[l.statut]}`).join(' ')

  const badge = (s: string) =>
    s === 'connecte' ? <Badge ton="vert">Connecté</Badge>
    : s === 'inactif' ? <Badge ton="gris">Pas de signal récent</Badge>
    : s === 'deconnecte' ? <Badge ton="rouge">Déconnecté</Badge>
    : s === 'manuel' ? <Badge>Relevés manuels</Badge>
    : <Badge ton="orange">Pas encore installé</Badge>

  const grille = 'grid items-center gap-3 px-5 py-4 md:grid-cols-[1.4fr_1.2fr_1fr_2fr_auto]'
  const Contenu = ({ l, fleche, autres }: { l: Ligne; fleche?: boolean; autres?: Ligne[] }) => (
    <>
      <div className="flex items-center gap-2">
        {fleche && (
          <span className="inline-block text-gray-400 transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
        )}
        <Link href={`/parc/client/${l.clientId}`} className="font-semibold underline">{l.client}</Link>
      </div>
      <div className="text-sm text-gray-600">
        {l.poste ? `${l.site} · ${l.poste}` : '—'}
        {autres && autres.length > 0 && (
          <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            +{autres.length} autre{autres.length > 1 ? 's' : ''}
            {autres.some((x) => x.statut === 'deconnecte') && <span className="text-red-600"> · dont déconnecté</span>}
          </span>
        )}
      </div>
      <div>{badge(l.statut)}</div>
      <div className="text-sm text-gray-600">
        {l.derniere ? <>Dernier signal : {formaterDate(l.derniere)} ({depuis(l.derniere)})</> : l.statut === 'manuel' ? '—' : 'Aucun signal reçu'}
        {l.version && <span className="text-gray-400"> · v{l.version}</span>}
        {l.erreur && <span className="mt-0.5 block text-xs text-red-600">Erreur du programme : {l.erreur}</span>}
      </div>
      <div className="md:text-right">
        {l.posteId ? (
          <Formulaire
            action={retirerPoste}
            message="Retiré"
            confirmation={`Retirer ${l.poste} de la liste ? (à faire seulement si le programme n'y est plus installé ou si cette ligne est un doublon)`}
          >
            <input type="hidden" name="id" value={l.posteId} />
            <Bouton className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-700">Retirer</Bouton>
          </Formulaire>
        ) : null}
      </div>
    </>
  )

  return (
    <>
      <h1 className="text-2xl font-bold">Connexions des clients</h1>
      <p className="mt-1 text-gray-600">
        Chaque ordinateur où le programme est installé (un par site chez le client) envoie un signal de vie toutes les minutes. Sans
        signal pendant le délai réglé pour le client (10 jours par défaut), vous êtes prévenu par mail. Les clients en « relevés
        manuels » ne sont pas surveillés.
      </p>
      <RechercheConnexions />
      <div className="mt-4 divide-y rounded-xl border bg-white">
        {groupes.length === 0 && <p className="p-6 text-gray-600">Aucun client pour l&apos;instant.</p>}
        {groupes.map((g) =>
          g.autres.length === 0 ? (
            <div key={g.cle} className={grille} data-ligne-connexion data-texte={texteDe(g)}>
              <Contenu l={g.tete} />
            </div>
          ) : (
            <details key={g.cle} className="group" data-ligne-connexion data-texte={texteDe(g)}>
              <summary className={`${grille} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                <Contenu l={g.tete} fleche autres={g.autres} />
              </summary>
              <div className="divide-y border-t bg-gray-50">
                {g.autres.map((l) => (
                  <div key={l.cle} className={grille}>
                    <Contenu l={l} />
                  </div>
                ))}
              </div>
            </details>
          ),
        )}
      </div>
    </>
  )
}
