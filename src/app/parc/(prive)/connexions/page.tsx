import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Badge, depuis, formaterDate } from '@/components/connect/affichage'
import { statutConnexion } from '@/lib/connect/agent'

export const dynamic = 'force-dynamic'

const ORDRE = { deconnecte: 0, jamais: 1, inactif: 2, connecte: 3 } as const

export default async function ConnexionsPage() {
  let clients
  try {
    clients = await prisma.connectClient.findMany({ include: { postes: { orderBy: { derniereConnexion: 'desc' } } } })
  } catch {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-6">La base de données n&apos;est pas encore prête.</p>
  }
  const lignes = clients
    .map((c) => {
      const derniere = c.postes[0]?.derniereConnexion ?? null
      const statut = c.modeReleve === 'manuel' ? ('manuel' as const) : statutConnexion(derniere, c.seuilDeconnexionJours)
      return { c, derniere, statut }
    })
    .sort((a, b) => (ORDRE[a.statut as keyof typeof ORDRE] ?? 4) - (ORDRE[b.statut as keyof typeof ORDRE] ?? 4) || a.c.nom.localeCompare(b.c.nom))

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
        Le programme installé chez le client envoie un signal de vie toutes les minutes. Sans signal pendant le délai réglé
        pour le client (10 jours par défaut), vous êtes prévenu par mail. Les clients en « relevés manuels » ne sont pas surveillés.
      </p>
      <div className="mt-6 divide-y rounded-xl border bg-white">
        {lignes.length === 0 && <p className="p-6 text-gray-600">Aucun client pour l&apos;instant.</p>}
        {lignes.map(({ c, derniere, statut }) => (
          <div key={c.id} className="grid items-center gap-3 px-5 py-4 md:grid-cols-[1.4fr_1fr_2fr]">
            <div>
              <Link href={`/parc/client/${c.id}`} className="font-semibold underline">{c.nom}</Link>
            </div>
            <div>{badge(statut)}</div>
            <div className="text-sm text-gray-600">
              {derniere ? (
                <>
                  Dernier signal : {formaterDate(derniere)} ({depuis(derniere)}) sur <strong>{c.postes[0].nom}</strong>
                  {c.postes.length > 1 && <span className="text-gray-400"> · {c.postes.length} ordinateurs</span>}
                </>
              ) : (
                statut === 'manuel' ? '—' : 'Aucun signal reçu'
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
