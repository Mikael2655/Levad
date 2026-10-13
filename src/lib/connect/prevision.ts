// Prévision de la durée restante d'une cartouche d'après sa consommation récente.

export const DELAI_ALERTE_JOURS = 10 // alerte quand il reste moins de 10 jours d'encre
export const HISTORIQUE_MIN_JOURS = 7 // en dessous de cet historique, on garde le seuil en %
export const FENETRE_JOURS = 60 // période observée (assez longue pour retrouver la cartouche précédente)
const JOUR = 86_400_000

export type Prevision = {
  fiable: boolean // assez de mesures depuis le dernier changement de cartouche
  jours: number | null // jours restants estimés ; null = consommation quasi nulle (très longue durée) ou prévision non fiable
}

type Segment = { t: number; p: number }[]

/** La baisse par jour (% par jour, négative quand le niveau baisse) d'une période sans changement de cartouche, ou null si elle est trop courte. */
function pente(seg: Segment): number | null {
  const n = seg.length
  if (n < 3) return null
  const etendue = (seg[n - 1].t - seg[0].t) / JOUR
  if (etendue < HISTORIQUE_MIN_JOURS - 0.75) return null
  const t0 = seg[0].t
  const xs = seg.map((s) => (s.t - t0) / JOUR)
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = seg.reduce((a, s) => a + s.p, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (seg[i].p - my)
    den += (xs[i] - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

/**
 * `points` : un niveau (en %) par jour environ. Les mesures sont découpées à chaque changement de cartouche (niveau qui remonte
 * nettement). La consommation est celle de la cartouche en cours si elle a assez de mesures ; sinon on reprend celle de la
 * cartouche précédente (le remplacement est une simple continuité) et on l'applique au niveau actuel.
 */
export function previsionJours(points: { t: number; p: number }[]): Prevision {
  const pts = [...points].sort((a, b) => a.t - b.t)
  if (pts.length === 0) return { fiable: false, jours: null }
  const segments: Segment[] = []
  let courant: Segment = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].p > pts[i - 1].p + 10) {
      segments.push(courant) // cartouche changée : une nouvelle période commence
      courant = []
    }
    courant.push(pts[i])
  }
  segments.push(courant)

  let p: number | null = null
  for (let i = segments.length - 1; i >= 0 && p === null; i--) p = pente(segments[i])
  if (p === null) return { fiable: false, jours: null }
  const actuel = pts[pts.length - 1].p
  if (actuel <= 0) return { fiable: true, jours: 0 }
  if (p > -0.03) return { fiable: true, jours: null } // moins de 1 % par mois : durée très longue
  return { fiable: true, jours: actuel / -p }
}
