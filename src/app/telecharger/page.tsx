import type { Metadata } from 'next'

// Page de téléchargement du programme Levad Connect (relevé des copieurs chez les clients).
// Les fichiers sont déposés automatiquement dans public/telechargements/ par la fabrication GitHub
// (voir .github/workflows/build-releve-snmp.yml).

export const metadata: Metadata = {
  title: 'Levad Connect — Télécharger',
  description: 'Programme de relevé des copieurs LEVAD',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.png' },
}

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

export default function TelechargerPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/levad-logo.png" alt="LEVAD" className="h-20 w-auto" />
        <div className="mt-6 h-1 w-full rounded" style={{ backgroundColor: VERT }} />

        <h1 className="mt-8 text-3xl font-bold">Levad Connect</h1>
        <p className="mt-2 text-lg text-gray-600">
          Un petit programme pour relever les compteurs et les niveaux d&apos;encre de vos copieurs.
          Rien à installer : on le télécharge, on l&apos;ouvre, c&apos;est tout.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="/telechargements/Levad-Connect.exe"
            download
            className="rounded-xl border-2 p-6 text-center transition hover:shadow-md"
            style={{ borderColor: VERT }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Ordinateur</p>
            <p className="mt-1 text-2xl font-bold">Windows</p>
            <span
              className="mt-4 inline-block rounded-lg px-5 py-3 font-semibold text-white"
              style={{ backgroundColor: VERT }}
            >
              Télécharger pour Windows
            </span>
          </a>
          <a
            href="/telechargements/Levad-Connect-Mac.zip"
            download
            className="rounded-xl border-2 p-6 text-center transition hover:shadow-md"
            style={{ borderColor: VERT }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Ordinateur</p>
            <p className="mt-1 text-2xl font-bold">Mac</p>
            <span
              className="mt-4 inline-block rounded-lg px-5 py-3 font-semibold text-white"
              style={{ backgroundColor: VERT }}
            >
              Télécharger pour Mac
            </span>
          </a>
        </div>

        <h2 className="mt-12 text-xl font-bold">Comment faire</h2>
        <ol className="mt-4 space-y-5">
          <Etape n={1} titre="Téléchargez le programme" texte="Cliquez sur le bouton correspondant à votre ordinateur, ci-dessus." />
          <Etape n={2} titre="Ouvrez-le" texte="Double-cliquez sur le fichier téléchargé (sur Mac, ouvrez d'abord le dossier compressé, puis l'application)." />
          <Etape n={3} titre="Indiquez le nom de votre société" texte="Puis cliquez sur « Lancer le relevé ». Comptez environ une minute." />
          <Etape n={4} titre="C'est terminé" texte="Le résultat est transmis automatiquement à LEVAD. Vous pouvez fermer la fenêtre." />
        </ol>

        <h2 className="mt-12 text-xl font-bold">Un message de sécurité s&apos;affiche ?</h2>
        <p className="mt-2 text-gray-600">
          C&apos;est normal : le programme est nouveau et n&apos;est pas encore connu de Microsoft et d&apos;Apple.
          Il ne présente aucun danger.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-5">
            <p className="font-semibold">Sur Windows</p>
            <p className="mt-1 text-gray-600">
              Si « Windows a protégé votre ordinateur » apparaît : cliquez sur{' '}
              <strong>Informations complémentaires</strong>, puis sur <strong>Exécuter quand même</strong>.
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-5">
            <p className="font-semibold">Sur Mac</p>
            <p className="mt-1 text-gray-600">
              Si Apple n&apos;a pas pu vérifier l&apos;application : cliquez sur <strong>Terminé</strong>, puis ouvrez le
              menu Pomme, <strong>Réglages Système</strong>, <strong>Confidentialité et sécurité</strong>, et cliquez sur{' '}
              <strong>Ouvrir quand même</strong> en bas de la page.
            </p>
          </div>
        </div>

        <h2 className="mt-12 text-xl font-bold">Ce que fait le programme</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-gray-600">
          <li>Il cherche les copieurs de votre réseau et lit leurs compteurs et niveaux d&apos;encre.</li>
          <li>Il ne modifie aucun réglage de vos machines.</li>
          <li>Il transmet le résultat à LEVAD, par une connexion sécurisée.</li>
        </ul>

        <p className="mt-12 border-t pt-6 text-sm text-gray-500">
          Une difficulté ? Contactez votre interlocuteur chez LEVAD.
        </p>
      </div>
    </main>
  )
}
