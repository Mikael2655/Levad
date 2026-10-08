// Petits éléments d'affichage partagés par les pages du suivi du parc.

export const VERT = '#8c9e8b'

const COULEURS: { cle: string; lettre: string; teinte: string }[] = [
  { cle: 'noir', lettre: 'N', teinte: '#374151' },
  { cle: 'cyan', lettre: 'C', teinte: '#06b6d4' },
  { cle: 'magenta', lettre: 'M', teinte: '#d946ef' },
  { cle: 'jaune', lettre: 'J', teinte: '#eab308' },
]

export type Encre = { couleur: string | null; pourcent: number | null; description?: string | null; note?: string | null }

export function formaterDate(d: Date) {
  return d.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function depuis(d: Date) {
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.round(h / 24)
  return `il y a ${j} jour${j > 1 ? 's' : ''}`
}

export function nombre(n: number | null | undefined) {
  return n === null || n === undefined ? '—' : n.toLocaleString('fr-FR')
}

/** Les quatre niveaux d'encre en barres. `alerte` = vrai pour les machines suivies (Canon LEVAD). */
export function Encres({
  encres,
  seuil,
  alerte,
  grand,
}: {
  encres: Encre[] | null | undefined
  seuil: number
  alerte: boolean
  grand?: boolean
}) {
  const liste = encres ?? []
  return (
    <div className={`grid grid-cols-4 ${grand ? 'gap-4' : 'gap-2'}`}>
      {COULEURS.map((c) => {
        const e = liste.find((x) => x.couleur === c.cle && x.pourcent !== null)
        const p = e?.pourcent ?? null
        const bas = alerte && p !== null && p <= seuil
        return (
          <div key={c.cle} title={e?.description ?? c.cle}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-gray-500">{c.lettre}</span>
              <span className={bas ? 'font-bold text-red-600' : 'text-gray-700'}>{p === null ? '—' : `${p} %`}</span>
            </div>
            <div className={`mt-1 overflow-hidden rounded bg-gray-200 ${grand ? 'h-3' : 'h-2'}`}>
              <div
                className="h-full rounded"
                style={{ width: `${p ?? 0}%`, backgroundColor: bas ? '#dc2626' : c.teinte }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Badge({ children, ton = 'gris' }: { children: React.ReactNode; ton?: 'gris' | 'orange' | 'rouge' | 'vert' }) {
  const styles = {
    gris: 'bg-gray-100 text-gray-700',
    orange: 'bg-amber-100 text-amber-800',
    rouge: 'bg-red-100 text-red-700',
    vert: 'bg-green-100 text-green-800',
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[ton]}`}>{children}</span>
}
