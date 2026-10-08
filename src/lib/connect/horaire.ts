// Plage d'envoi du mail quotidien des alertes, en heure de Paris : de 16 h 30 (inclus) à 19 h (exclu).
// Les passages planifiés de GitHub peuvent arriver avec du retard ; tant qu'on est dans la plage, le mail
// part (une seule fois par jour, grâce à l'enregistrement du jour envoyé).

export const DEBUT_MINUTES = 16 * 60 + 30
export const FIN_MINUTES = 19 * 60

export function dansLaPlageDEnvoi(heure: number, minute: number): boolean {
  const m = heure * 60 + minute
  return m >= DEBUT_MINUTES && m < FIN_MINUTES
}
