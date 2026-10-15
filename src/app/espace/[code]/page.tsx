import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { MOTIF_CODE } from '@/lib/connect/agent'
import { connectMetadata, connectViewport } from '@/lib/connect/metadata'
import { COULEURS, NOM_COULEUR, etatDuParc, stockDuGroupe, stocksParGroupe, type Couleur } from '@/lib/connect/alertes'
import { grouper } from '@/lib/connect/gammes'
import { groupesParSite, libelleMachine } from '@/lib/connect/libelle'
import { NOM_COURT_COMPTEUR, type Compteurs } from '@/lib/connect/calcul'
import { VERT, formaterDate, jour, nombre } from '@/components/connect/affichage'

// Espace client : la page privée (lien secret, sans mot de passe) où un client consulte son parc —
// compteurs, niveaux d'encre avec date de fin estimée, stocks de cartouches. Lecture seule.

export const metadata: Metadata = { ...connectMetadata, title: 'Levad Connect — Votre parc', manifest: undefined, appleWebApp: undefined }
export const viewport: Viewport = connectViewport
export const dynamic = 'force-dynamic'

const TEINTE: Record<Couleur, string> = { noir: '#374151', cyan: '#06b6d4', magenta: '#d946ef', jaune: '#eab308' }

// Libellés tels qu'ils s'affichent sur l'écran de la machine
const NOM_MACHINE: Record<string, string> = {
  '112': 'Total (Noir et blanc/Grand format)',
  '113': 'Total (Noir et blanc/Petit format)',
  '122': 'Total (Couleur/Grand format)',
  '123': 'Total (Couleur/Petit format)',
  '501': 'Total (Numérisation)',
}
const PRINCIPAUX = ['112', '113', '122', '123']
const AUTRES = ['108', '109', '106', '125']

function fin(jours: number | null, mode: 'duree' | 'pourcent'): string | null {
  if (mode !== 'duree') return null
  if (jours === null) return 'durée longue'
  if (jours < 1) return 'fin estimée : demain'
  return `fin estimée : vers le ${jour(new Date(Date.now() + jours * 86400000))}`
}

export default async function EspaceClient({ params }: { params: { code: string } }) {
  if (!MOTIF_CODE.test(params.code)) notFound()
  let client
  try {
    client = await prisma.connectClient.findUnique({
      where: { codeEspace: params.code },
      include: {
        machines: {
          where: { categorie: 'mine', horsContrat: false },
          orderBy: [{ site: 'asc' }, { creeLe: 'asc' }],
          include: { releves: { orderBy: { date: 'desc' }, take: 1, select: { date: true, compteurs: true } } },
        },
      },
    })
  } catch {
    notFound()
  }
  if (!client) notFound()

  const [parc, stocks] = await Promise.all([etatDuParc(), stocksParGroupe()])
  const etats = new Map((parc.find((c) => c.id === client.id)?.machines ?? []).map((m) => [m.id, m.couleurs]))
  const sites = groupesParSite(client.machines)
  const groupes = grouper(client.machines)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Image src="/levad-logo.png" alt="LEVAD" width={96} height={32} className="h-8 w-auto" priority />
          <p className="font-semibold">Votre parc de machines</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold">{client.nom}</h1>
        {client.machines.length === 0 && <p className="mt-6 rounded-xl border bg-white p-6 text-gray-600">Aucune machine à afficher pour le moment.</p>}

        {sites.map(([site, machines]) => (
          <section key={site} className="mt-6">
            {sites.length > 1 && <h2 className="text-lg font-bold">{site}</h2>}
            <div className="mt-2 space-y-4">
              {machines.map((m) => {
                const r = m.releves[0]
                const compteurs = (r?.compteurs ?? {}) as unknown as Compteurs
                const numeros = PRINCIPAUX.some((n) => compteurs[n]) ? [...PRINCIPAUX, '501'] : [...AUTRES, '501']
                const lignes = numeros.filter((n) => compteurs[n])
                const couleurs = etats.get(m.id) ?? []
                return (
                  <article key={m.id} className="rounded-xl border bg-white p-5">
                    <h3 className="text-lg font-semibold">{libelleMachine(m, 'Machine')}</h3>
                    {m.numeroSerie && <p className="text-xs text-gray-500">N° de série {m.numeroSerie}</p>}

                    <h4 className="mt-4 text-sm font-semibold text-gray-700">Compteurs{r ? ` au ${formaterDate(r.date)}` : ''}</h4>
                    {lignes.length === 0 ? (
                      <p className="mt-1 text-sm text-gray-500">Pas encore de relevé.</p>
                    ) : (
                      <table className="mt-1 w-full text-sm">
                        <tbody>
                          {lignes.map((n) => (
                            <tr key={n} className="border-b last:border-0">
                              <td className="py-1.5 pr-3 text-gray-700">
                                <span className="mr-2 font-mono text-gray-500">{n}</span>
                                {NOM_MACHINE[n] ?? NOM_COURT_COMPTEUR[n] ?? compteurs[n].nom ?? ''}
                              </td>
                              <td className="whitespace-nowrap py-1.5 text-right font-semibold tabular-nums">{nombre(compteurs[n].v)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <h4 className="mt-4 text-sm font-semibold text-gray-700">Niveaux d&apos;encre</h4>
                    {couleurs.every((c) => c.pourcent === null) ? (
                      <p className="mt-1 text-sm text-gray-500">Niveaux non disponibles.</p>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {couleurs.map((c) => (
                          <div key={c.couleur}>
                            <p className="text-xs font-semibold text-gray-600">{NOM_COULEUR[c.couleur]}</p>
                            <div className="mt-1 h-2.5 overflow-hidden rounded bg-gray-200">
                              <div className="h-full rounded" style={{ width: `${c.pourcent ?? 0}%`, backgroundColor: TEINTE[c.couleur] }} />
                            </div>
                            <p className="mt-0.5 text-sm text-gray-800">{c.pourcent === null ? '—' : `${c.pourcent} %`}</p>
                            {c.pourcent !== null && fin(c.jours, c.mode) && <p className="text-xs text-gray-500">{fin(c.jours, c.mode)}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        ))}

        {groupes.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Vos stocks de cartouches</h2>
            <div className="mt-2 space-y-4">
              {groupes.map((g) => {
                const stock = stockDuGroupe(stocks, client.id, g.cle)
                const couleurs = g.gamme ? COULEURS.filter((c) => g.gamme!.refs[c]) : COULEURS
                return (
                  <div key={g.cle} className="rounded-xl border bg-white p-5">
                    <p className="font-semibold">
                      {sites.length > 1 ? `${g.site} · ` : ''}
                      {g.machines.map((m) => libelleMachine(m, 'Machine')).join(', ')}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {couleurs.map((c) => (
                        <div key={c} className="rounded-lg bg-gray-50 p-3 text-center">
                          <p className="text-sm text-gray-500">{NOM_COULEUR[c]}</p>
                          <p className={`text-2xl font-bold ${stock[c] === 0 ? 'text-gray-400' : ''}`}>{stock[c]}</p>
                          {g.gamme?.refs[c] && <p className="text-xs text-gray-500">{g.gamme.refs[c]}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-xs text-gray-500" style={{ color: VERT }}>
          Informations mises à jour automatiquement par Levad Connect. Une question ? Contactez LEVAD.
        </p>
      </main>
    </div>
  )
}
