import { GAMMES, type Gamme, type Refs } from './gammes-data'

export { GAMMES }
export type { Gamme, Refs }

// Le numéro du modèle (ex. 3520 dans « iR-ADV C3520i », 643 dans « MF643Cdw ») : première suite de 3 chiffres ou plus.
export function numeroModele(modele: string | null | undefined): number | null {
  const m = (modele ?? '').match(/\d{3,}/)
  return m ? Number(m[0]) : null
}

/** La gamme reconnue d'après le nom du modèle (variante standard), ou null si le modèle n'est pas dans la liste. */
export function gammeAuto(modele: string | null | undefined): Gamme | null {
  const n = numeroModele(modele)
  if (n === null) return null
  const candidates = GAMMES.filter((g) => g.defaut)
  return (
    candidates.find((g) => g.numeros.includes(n)) ??
    (n >= 1000 ? candidates.find((g) => g.prefixes.includes(Math.floor(n / 100))) : undefined) ??
    null
  )
}

/** Une famille = un même modèle de copieur et ses cartouches : la version standard et, s'il y en a, ses versions L / H. */
export type Famille = { cle: string; modeles: string; variantes: Gamme[] } // variantes[0] = standard

export const FAMILLES: Famille[] = (() => {
  const res = new Map<string, Famille>()
  for (const g of GAMMES) {
    const f = res.get(g.modeles) ?? { cle: '', modeles: g.modeles, variantes: [] }
    if (g.defaut) f.variantes.unshift(g)
    else f.variantes.push(g)
    f.cle = f.variantes[0].code
    res.set(g.modeles, f)
  }
  return Array.from(res.values())
})()

export function familleDe(g: Gamme): Famille {
  return FAMILLES.find((f) => f.modeles === g.modeles)!
}

/** La gamme (version standard de la famille) correspondant à un code ; une version L / H renvoie sa famille. */
export function gammeParCode(code: string | null | undefined): Gamme | null {
  const g = code ? GAMMES.find((x) => x.code === code) : null
  return g ? familleDe(g).variantes[0] : null
}

type MachineGamme = { id: number; site: string; modele: string | null; gamme: string | null }

/** Gamme d'une machine : celle choisie à la main, sinon celle reconnue d'après le modèle. */
export function gammeDe(m: Pick<MachineGamme, 'modele' | 'gamme'>): Gamme | null {
  return gammeParCode(m.gamme) ?? gammeAuto(m.modele)
}

/**
 * Groupe de stock : les machines d'un même site dont les cartouches sont compatibles partagent le même stock.
 * Une machine dont la gamme n'est pas reconnue a son propre stock, tant qu'on ne lui a pas indiqué sa gamme.
 */
export function cleGroupe(m: MachineGamme): string {
  const g = gammeDe(m)
  return `${m.site}|${g ? g.code : `machine-${m.id}`}`
}

/** Références Canon d'un groupe (celles de la gamme, sinon vide). */
export function refsDe(m: Pick<MachineGamme, 'modele' | 'gamme'>): Refs {
  return gammeDe(m)?.refs ?? { noir: null, cyan: null, magenta: null, jaune: null }
}

export type GroupeStock<T> = { cle: string; site: string; gamme: Gamme | null; machines: T[] }

/** Regroupe les machines d'un client par groupe de stock (site, puis gamme), sites par ordre alphabétique. */
export function grouper<T extends MachineGamme>(machines: T[]): GroupeStock<T>[] {
  const res = new Map<string, GroupeStock<T>>()
  for (const m of machines) {
    const cle = cleGroupe(m)
    const g = res.get(cle) ?? { cle, site: m.site, gamme: gammeDe(m), machines: [] }
    g.machines.push(m)
    res.set(cle, g)
  }
  return Array.from(res.values()).sort(
    (a, b) => a.site.localeCompare(b.site, 'fr', { sensitivity: 'base' }) || (a.gamme?.code ?? 'zzz').localeCompare(b.gamme?.code ?? 'zzz')
  )
}

export const COULEURS_GAMME = ['noir', 'cyan', 'magenta', 'jaune'] as const
