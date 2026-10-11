import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Badge, depuis, formaterDate } from '@/components/connect/affichage'
import { statutConnexion } from '@/lib/connect/agent'

export const dynamic = 'force-dynamic'

const ORDRE = { deconnecte: 0, jamais: 1, inactif: 2, connecte: 3, manuel: 4 } as const

type Ligne = { erreur?: string | null; version?: string | null; cle: string; clientId: number; client: string; poste: string | null; site: string | null; derniere: Date | null; statut: keyof typeof ORDRE }

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
      clientId: c.id,
      client: c.nom,
      poste: p.nom,
      site: p.site,
      derniere: p.derniereConnexion,
      statut: statutConnexion(p.derniereConnexion, c.seuilDeconnexionJours),
      version: p.versionAgent,
      erreur: p.derniereErreur && p.derniereErreurLe && Date.now() - p.derniereErreurLe.getTime() < 24 * 3600 * 1000 ? `${p.derniereErreur} (${formaterDate(p.derniereErreurLe)})` : null,
    }))
  })
  lignes.sort((a, b) => ORDRE[a.statut] - ORDRE[b.statut] || a.client.localeCompare(b.client) || (a.site ?? '').localeCompare(b.site ?? ''))

  const badge = (s: string) =>
    s === 'connecte' ? <Badge ton="vert">Connecté</Badge>
    : s === 'inactif' ? <Badge ton="gris">Pas de signal récent</Badge>
    : s === 'deconnecte' ? <Badge ton="rouge">Déconnecté</Badge>
    : s === 'manuel' ? <Badge>Relevés manuels</Badge>
    : <Badge ton="orange">Pas encore installé</Badge>

  return (
    <>
      <h1 className="text-2xl font-bold">Connexions des clients</h1>
      <p className="mt-1 text-gray-600">
        Chaque ordinateur où le programme est installé (un par site chez le client) envoie un signal de vie toutes les minutes. Sans
        signal pendant le délai réglé pour le client (10 jours par défaut), vous êtes prévenu par mail. Les clients en « relevés
        manuels » ne sont pas surveillés.
      </p>
      <div className="mt-6 divide-y rounded-xl border bg-white">
        {lignes.length === 0 && <p className="p-6 text-gray-600">Aucun client pour l&apos;instant.</p>}
        {lignes.map((l) => (
          <div key={l.cle} className="grid items-center gap-3 px-5 py-4 md:grid-cols-[1.4fr_1.2fr_1fr_2fr]">
            <div>
              <Link href={`/parc/client/${l.clientId}`} className="font-semibold underline">{l.client}</Link>
            </div>
            <div className="text-sm text-gray-600">{l.poste ? `${l.site} · ${l.poste}` : '—'}</div>
            <div>{badge(l.statut)}</div>
            <div className="text-sm text-gray-600">
              {l.derniere ? <>Dernier signal : {formaterDate(l.derniere)} ({depuis(l.derniere)})</> : l.statut === 'manuel' ? '—' : 'Aucun signal reçu'}
              {l.version && <span className="text-gray-400"> · v{l.version}</span>}
              {l.erreur && <span className="mt-0.5 block text-xs text-red-600">Erreur du programme : {l.erreur}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
