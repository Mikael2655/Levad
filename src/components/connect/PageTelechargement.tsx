// Contenu de la page de téléchargement de Levad Connect (générique ou lien personnel d'un client).
const VERT = '#8c9e8b'

function Capture({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="mt-2 h-auto max-w-full rounded-lg border border-gray-200 shadow-sm" style={{ maxWidth: 'min(380px, 100%)' }} />
  )
}

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
          <Etape n={2} titre="Ouvrez-le" texte="Double-cliquez sur le fichier téléchargé (sur Mac, ouvrez d'abord le dossier compressé, puis l'application)." />
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

        <h2 id="avertissements" className="mt-12 scroll-mt-6 text-xl font-bold">Un message s&apos;affiche au téléchargement ou à l&apos;ouverture ?</h2>
        <p className="mt-2 text-gray-600">
          C&apos;est normal et sans danger : le programme est récent, et Windows comme les navigateurs préviennent pour tout
          programme encore peu téléchargé. Le programme est signé par <strong>Levad</strong> : vérifiez que l&apos;éditeur
          affiché est bien <strong>Levad</strong>, puis confirmez comme ci-dessous.
        </p>

        <h3 className="mt-6 font-semibold">1. Dans votre navigateur (au téléchargement)</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl bg-gray-50 p-5">
            <p className="font-semibold">Microsoft Edge</p>
            <ol className="mt-2 space-y-5 text-gray-600">
              <li>
                <p><strong>1.</strong> Le fichier est signalé comme « pas fréquemment téléchargé ».</p>
                <Capture src="/aide/aide-edge-1-avertissement.png" alt="Edge : message « n'est pas fréquemment téléchargé »" />
              </li>
              <li>
                <p><strong>2.</strong> Cliquez sur les <strong>trois points « … »</strong> à droite du fichier, puis sur <strong>Conserver</strong>.</p>
                <Capture src="/aide/aide-edge-2-conserver.png" alt="Edge : menu avec l'option Conserver" />
              </li>
              <li>
                <p><strong>3.</strong> Vérifiez que l&apos;<strong>éditeur</strong> indiqué est <strong>Levad</strong>.</p>
                <Capture src="/aide/aide-edge-3-verifier.png" alt="Edge : fenêtre « Vérifiez que vous faites confiance », éditeur Levad" />
              </li>
              <li>
                <p><strong>4.</strong> Cliquez sur la <strong>flèche à droite du bouton « Supprimer »</strong>, puis sur <strong>Conserver quand même</strong>.</p>
                <Capture src="/aide/aide-edge-4-conserver-quand-meme.png" alt="Edge : option Conserver quand même" />
              </li>
            </ol>
          </div>
          <div className="min-w-0 rounded-xl bg-gray-50 p-5">
            <p className="font-semibold">Google Chrome</p>
            <ol className="mt-2 space-y-5 text-gray-600">
              <li>
                <p><strong>1.</strong> Chrome affiche « Téléchargement suspect bloqué » : cliquez sur ce message.</p>
                <Capture src="/aide/aide-chrome-1-bloque.png" alt="Chrome : Téléchargement suspect bloqué" />
              </li>
              <li>
                <p>
                  <strong>2.</strong> Au message « Ce fichier n&apos;est pas souvent téléchargé », cliquez sur{' '}
                  <strong>Télécharger le fichier suspect</strong> (et non sur « Supprimer de l&apos;historique »).
                </p>
                <Capture src="/aide/aide-chrome-2-telecharger.png" alt="Chrome : bouton Télécharger le fichier suspect" />
              </li>
            </ol>
          </div>
        </div>

        <h3 className="mt-8 font-semibold">2. À l&apos;ouverture du fichier</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl bg-gray-50 p-5">
            <p className="font-semibold">Sur Windows</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-600">
              <li>Si « Windows a protégé votre ordinateur » apparaît, cliquez sur <strong>Informations complémentaires</strong>.</li>
              <li>Vérifiez que l&apos;<strong>Éditeur</strong> indiqué est <strong>Levad</strong>.</li>
              <li>Cliquez sur <strong>Exécuter quand même</strong>.</li>
            </ol>
          </div>
          <div className="min-w-0 rounded-xl bg-gray-50 p-5">
            <p className="font-semibold">Sur Mac</p>
            <p className="mt-2 text-gray-600">
              Si Apple n&apos;a pas pu vérifier l&apos;application : cliquez sur <strong>Terminé</strong>, puis ouvrez le
              menu Pomme, <strong>Réglages Système</strong>, <strong>Confidentialité et sécurité</strong>, et cliquez sur{' '}
              <strong>Ouvrir quand même</strong> en bas de la page.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Ces messages disparaissent avec le temps, à mesure que le programme est téléchargé. Une difficulté ? Contactez votre
          interlocuteur chez LEVAD.
        </p>

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
