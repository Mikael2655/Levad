'use client'

// Page d'erreur de l'outil de financement : remplace le message technique de Next.js par une explication utile.
export default function ErreurFinancement({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="max-w-xl mx-auto p-6">
      <div className="carte p-6 space-y-3 text-sm text-gray-700">
        <h1 className="text-lg font-bold text-gray-900">Une erreur est survenue</h1>
        <p>La page n’a pas pu s’afficher. Vos données ne sont pas perdues.</p>
        <ul className="list-disc list-inside text-gray-600">
          <li>Essayez de recharger la page.</li>
          <li>Si le problème continue, l’administrateur peut ouvrir <b>Administration</b> : l’écran y indique si la base de données doit être mise à jour.</li>
          <li>Sinon, communiquez le code ci-dessous pour retrouver l’erreur dans les journaux.</li>
        </ul>
        {error.digest && <p className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1">Code : {error.digest}</p>}
        <div className="flex gap-3">
          <button className="bg-accent-700 hover:bg-accent-800 text-white shadow-sm shadow-accent-800/20 transition rounded-lg px-4 py-1.5 font-semibold" onClick={reset}>Réessayer</button>
          <a className="underline text-gray-600 py-1.5" href="/financement">Retour à l’accueil</a>
        </div>
      </div>
    </main>
  )
}
