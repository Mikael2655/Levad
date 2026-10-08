// Petits éléments d'affichage partagés par les pages du suivi du parc.

export const VERT = '#8c9e8b'

const COULEURS: { cle: string; nom: string; teinte: string }[] = [
  { cle: 'noir', nom: 'Noir', teinte: '#374151' },
  { cle: 'cyan', nom: 'Cyan', teinte: '#06b6d4' },
  { cle: 'magenta', nom: 'Magenta', teinte: '#d946ef' },
  { cle: 'jaune', nom: 'Jaune', teinte: '#eab308' },
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

/**
 * Les quatre niveaux d'encre en barres, avec le nom de chaque couleur.
 *  - normal : barre de la couleur ;
 *  - niveau bas mais cartouche en stock chez le client : orange ;
 *  - niveau bas ET plus de stock : rouge (c'est l'alerte).
 * `seuils` et `stock` ne servent que pour « mes machines » ; sans eux, aucune alerte n'est affichée.
 */
export function Encres({
  encres,
  seuils,
  stock,
  grand,
}: {
  encres: Encre[] | null | undefined
  seuils?: Record<string, number>
  stock?: Record<string, number>
  grand?: boolean
}) {
  const liste = encres ?? []
  return (
    <div className={`grid grid-cols-4 ${grand ? 'gap-4' : 'gap-2'}`}>
      {COULEURS.map((c) => {
        const e = liste.find((x) => x.couleur === c.cle && x.pourcent !== null)
        const p = e?.pourcent ?? null
        const bas = Boolean(seuils) && p !== null && p <= (seuils?.[c.cle] ?? 25)
        const enStock = (stock?.[c.cle] ?? 0) > 0
        const alerte = bas && !enStock
        const orange = bas && enStock
        const couleurBarre = alerte ? '#dc2626' : orange ? '#f59e0b' : c.teinte
        return (
          <div key={c.cle} title={e?.description ?? c.nom}>
            <p className="text-xs font-semibold text-gray-600">{c.nom}</p>
            <div className={`mt-1 overflow-hidden rounded bg-gray-200 ${grand ? 'h-3' : 'h-2'}`}>
              <div className="h-full rounded" style={{ width: `${p ?? 0}%`, backgroundColor: couleurBarre }} />
            </div>
            <p
              className={`mt-0.5 text-xs ${
                alerte ? 'font-bold text-red-600' : orange ? 'font-semibold text-amber-600' : 'text-gray-700'
              }`}
            >
              {p === null ? '—' : `${p} %`}
              {alerte && ' · plus de stock'}
              {orange && ' · en stock'}
            </p>
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
