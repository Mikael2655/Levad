// Prévision de la durée restante d'une cartouche d'après sa consommation récente.

export const DELAI_ALERTE_JOURS = 10 // alerte quand il reste moins de 10 jours d'encre
export const HISTORIQUE_MIN_JOURS = 7 // en dessous de cet historique, on garde le seuil en %
export const FENETRE_JOURS = 30 // période observée
const JOUR = 86_400_000

export type Prevision = {
  fiable: boolean // assez de mesures depuis le dernier changement de cartouche
  jours: number | null // jours restants estimés ; null = consommation quasi nulle (très longue durée) ou prévision non fiable
}

/**
 * `points` : un niveau (en %) par jour environ. La mesure repart de zéro à chaque changement de cartouche
 * (niveau qui remonte nettement). La baisse par jour est une droite ajustée sur toutes les mesures de la période.
 */
export function previsionJours(points: { t: number; p: number }[]): Prevision {
  const pts = [...points].sort((a, b) => a.t - b.t)
  if (pts.length < 3) return { fiable: false, jours: null }
  let debut = 0
  for (let i = pts.length - 1; i >= 1; i--) {
    if (pts[i].p > pts[i - 1].p + 10) {
      debut = i // cartouche changée : la période utile commence ici
      break
    }
  }
  const seg = pts.slice(debut)
  const etendue = (seg[seg.length - 1].t - seg[0].t) / JOUR
  if (seg.length < 3 || etendue < HISTORIQUE_MIN_JOURS - 0.75) return { fiable: false, jours: null }

  const n = seg.length
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
  const pente = den === 0 ? 0 : num / den // % par jour (négative quand le niveau baisse)
  const actuel = seg[n - 1].p
  if (actuel <= 0) return { fiable: true, jours: 0 }
  if (pente > -0.03) return { fiable: true, jours: null } // moins de 1 % par mois : durée très longue
  return { fiable: true, jours: actuel / -pente }
}
