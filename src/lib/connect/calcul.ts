// Règles de calcul des totaux N&B et couleur (A3 compté double), d'après le cahier des charges.
// La règle se choisit PAR MACHINE : on applique la première recette dont tous les compteurs existent,
// et on prévient si plusieurs recettes donnent des résultats différents.

export type Compteurs = Record<string, { v: number; nom?: string }>

type Terme = [number, number] // [coefficient, numéro de compteur]

export const RECETTES: { code: string; nom: string; formule: string; nb: Terme[]; couleur: Terme[] }[] = [
  { code: 'A', nom: 'Directe', formule: '109 / 106', nb: [[1, 109]], couleur: [[1, 106]] },
  {
    code: 'B',
    nom: 'Total + grands formats',
    formule: '108 + 112 / 125 + 122',
    nb: [[1, 108], [1, 112]],
    couleur: [[1, 125], [1, 122]],
  },
  {
    code: 'C',
    nom: 'Détaillée',
    formule: '112 × 2 + 113 / 122 × 2 + 123',
    nb: [[2, 112], [1, 113]],
    couleur: [[2, 122], [1, 123]],
  },
  // Machine sans grand format (pas de 112 / 122) : le petit format est le total.
  { code: 'D', nom: 'Petit format seul', formule: '113 / 123', nb: [[1, 113]], couleur: [[1, 123]] },
]

export type Resultat = { code: string; nom: string; formule: string; nb: number; couleur: number; utilises: number[] }

function somme(c: Compteurs, termes: Terme[]): number | null {
  let total = 0
  for (const [coef, n] of termes) {
    const x = c[String(n)]
    if (!x || typeof x.v !== 'number') return null
    total += coef * x.v
  }
  return total
}

export function calculer(c: Compteurs, choix?: string | null) {
  const applicables: Resultat[] = []
  for (const r of RECETTES) {
    const nb = somme(c, r.nb)
    const couleur = somme(c, r.couleur)
    if (nb !== null && couleur !== null) {
      applicables.push({
        code: r.code,
        nom: r.nom,
        formule: r.formule,
        nb,
        couleur,
        utilises: [...r.nb, ...r.couleur].map((t) => t[1]),
      })
    }
  }
  const choisie = choix ? applicables.find((r) => r.code === choix) : undefined
  const retenue = choisie ?? applicables[0] ?? null
  const differents = new Set(applicables.map((r) => `${r.nb}/${r.couleur}`)).size > 1
  return {
    applicables,
    retenue,
    // une recette demandée à la main mais impossible (compteurs absents)
    choixImpossible: Boolean(choix) && !choisie,
    avertissement:
      !choix && differents
        ? 'Plusieurs recettes sont possibles et donnent des résultats différents : choisissez la bonne pour cette machine.'
        : null,
    aConfigurer: applicables.length === 0,
  }
}

/** Noms courts des compteurs Canon pour l'affichage (A4 / A3, N&B / couleur) ; les compteurs « 2 » comptent chaque A3 double. */
export const NOM_COURT_COMPTEUR: Record<string, string> = {
  '101': 'Total A4 + A3',
  '102': 'Total A4 + 2×A3',
  '106': 'A4 + 2×A3 couleur',
  '108': 'A4 + A3 N&B',
  '109': 'A4 + 2×A3 N&B',
  '112': 'A3 N&B',
  '113': 'A4 N&B',
  '122': 'A3 couleur',
  '123': 'A4 couleur',
  '125': 'A4 + A3 couleur',
  '301': 'Impressions',
  '501': 'Scans',
}

/**
 * Autres marques : N&B et couleur d'après les compteurs standard du relevé (clés « std:nb:… », « std:couleur:… »).
 * Retourne null si la machine n'en a pas transmis (ancien relevé ou machine qui ne les fournit pas).
 */
export function totauxStandard(c: Compteurs | null | undefined) {
  const somme = (type: string) => {
    const lignes = Object.entries(c ?? {}).filter(([k]) => k.startsWith(`std:${type}:`))
    return lignes.length ? lignes.reduce((n, [, x]) => n + x.v, 0) : null
  }
  const nb = somme('nb')
  const couleur = somme('couleur')
  const total = somme('total')
  if (nb === null && couleur === null) return null
  return { nb, couleur, total: total ?? (nb ?? 0) + (couleur ?? 0) }
}
