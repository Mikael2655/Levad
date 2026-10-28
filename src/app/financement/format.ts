const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
export const euros = (centimes: number | null | undefined) => (centimes == null ? '—' : EUR.format(centimes / 100))
export const pourcentCoef = (ppm: number) => `${(ppm / 10000).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} %`
export const dateFr = (d: Date | string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
export const dateHeureFr = (d: Date | string) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })
export const dureeLibelle = (mois: number) => (mois % 3 === 0 ? `${mois} mois (${mois / 3} trimestres)` : `${mois} mois`)
export const libellePeriodicite = (p: string) => (p === 'MENSUELLE' ? 'mensuel' : 'trimestriel')
