// Aide au dépannage de la configuration Vercel. Ne renvoie JAMAIS de valeur de variable : seulement des noms,
// l'environnement et la version du déploiement.
export function diagnosticEnvironnement(filtre: RegExp): string {
  const env = process.env.VERCEL_ENV ?? 'inconnu'
  const version = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || 'inconnue'
  const noms = Object.keys(process.env).filter(k => filtre.test(k)).sort()
  return `environnement : ${env} · version : ${version} · variables aux noms voisins reçues : ${noms.length ? noms.map(n => `« ${n} »`).join(', ') : 'aucune'}`
}
