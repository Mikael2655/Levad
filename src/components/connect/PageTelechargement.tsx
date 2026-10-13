// Contenu de la page de téléchargement de Levad Connect (générique ou lien personnel d'un client).
import { CommentFaire } from './CommentFaire'

const VERT = '#8c9e8b'

export function PageTelechargement({
  lienWindows = '/telechargements/Levad-Connect.exe',
  lienMac = '/telechargements/Levad-Connect-Mac.zip',
  resident = false,
}: {
  lienWindows?: string
  lienMac?: string
  resident?: boolean
}) {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/levad-logo.png" alt="LEVAD" className="h-20 w-auto" />
        <div className="mt-6 h-1 w-full rounded" style={{ backgroundColor: VERT }} />

        <h1 className="mt-8 text-3xl font-bold">Levad Connect</h1>
        <p className="mt-2 text-lg text-gray-600">
          {resident
            ? "Outil de e-maintenance qui permet à Levad de recevoir les alertes sur vos besoins en encre et vos relevés compteurs."
            : "Un petit programme pour relever les compteurs et les niveaux d'encre de vos copieurs. Rien à installer : on le télécharge, on l'ouvre, c'est tout."}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href={lienWindows}
            download
            className="block text-center"
          >
            <span
              className="block rounded-lg px-5 py-4 text-lg font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: VERT }}
            >
              Télécharger pour Windows
            </span>
          </a>
          <a
            href={lienMac}
            download
            className="block text-center"
          >
            <span
              className="block rounded-lg px-5 py-4 text-lg font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: VERT }}
            >
              Télécharger pour Mac
            </span>
          </a>
        </div>

        <CommentFaire resident={resident} />

        <h2 className="mt-12 text-xl font-bold">Ce que fait le programme</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-gray-600">
          <li>Il cherche les copieurs de votre réseau et lit leurs compteurs et niveaux d&apos;encre.</li>
          <li>Il ne modifie aucun réglage de vos machines.</li>
          <li>Il transmet le résultat à LEVAD, par une connexion sécurisée.</li>
          {resident && <li>Pour le désinstaller : rouvrez le programme et cliquez sur « Désinstaller ».</li>}
        </ul>

        <p className="mt-12 border-t pt-6 text-sm text-gray-500">
          Une difficulté ? Contactez votre interlocuteur chez LEVAD.
        </p>
      </div>
    </main>
  )
}
