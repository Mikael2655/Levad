/** Date/heure d'un match affichée en heure de Paris, quel que soit le fuseau du serveur. */
export function formatKickoff(date: Date | string) {
  return new Date(date).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  })
}
