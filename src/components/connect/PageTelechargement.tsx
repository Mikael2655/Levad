// Contenu de la page de téléchargement de Levad Connect (générique ou lien personnel d'un client).
import { AideAvertissements } from './AideAvertissements'

const VERT = '#8c9e8b'

function Etape({ n, titre, texte }: { n: number; titre: string; texte: string }) {
  return (
    <li className="flex gap-4">
      <span
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-base font-bold text-white"
        style={{ backgroundColor: VERT }}
      >
        {n}
      </span>
      <div>
        <p className="font-semibold text-gray-900">{titre}</p>
        <p className="text-gray-600">{texte}</p>
      </div>
    </li>
  )
}

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

        <p className="mt-4 text-sm text-gray-500">
          Un message d&apos;avertissement s&apos;affiche ? C&apos;est normal : <a href="#avertissements" className="underline">voici quoi faire</a>.
        </p>

        <h2 className="mt-12 text-xl font-bold">Comment faire</h2>
        <ol className="mt-4 space-y-5">
          <Etape n={1} titre="Téléchargez le programme" texte="Cliquez sur le bouton correspondant à votre ordinateur, ci-dessus." />
          <Etape n={2} titre="Ouvrez-le" texte={resident ? "Sous Windows, double-cliquez sur le fichier téléchargé. Sur Mac, ouvrez le dossier compressé (zip) téléchargé : un dossier « Levad-Connect-… » apparaît, double-cliquez sur l'application « Levad Connect » qu'il contient." : "Double-cliquez sur le fichier téléchargé (sur Mac, ouvrez d'abord le dossier compressé, puis l'application)."} />
          {resident ? (
            <>
              <Etape n={3} titre="Cliquez sur « Installer »" texte="L'installation prend quelques secondes. Le programme lit vos copieurs une première fois." />
              <Etape n={4} titre="C'est terminé" texte="Le programme fonctionne désormais en arrière-plan, à chaque démarrage de l'ordinateur. Vous pouvez fermer la fenêtre. En cas de changement d'ordinateur, retéléchargez-le avec ce même lien." />
            </>
          ) : (
            <>
              <Etape n={3} titre="Indiquez le nom de votre société" texte="Puis cliquez sur « Lancer le relevé ». Comptez environ une minute." />
              <Etape n={4} titre="C'est terminé" texte="Le résultat est transmis automatiquement à LEVAD. Vous pouvez fermer la fenêtre." />
            </>
          )}
        </ol>

        <AideAvertissements />

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
