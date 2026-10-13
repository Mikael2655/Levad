'use client'

import { useEffect, useState } from 'react'

type Systeme = 'windows' | 'mac'

function Capture({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="mt-2 h-auto max-w-full rounded-lg border border-gray-200 shadow-sm" style={{ maxWidth: 'min(380px, 100%)' }} />
  )
}

const carte = 'min-w-0 rounded-xl bg-gray-50 p-5'

// « Besoin d'aide sur : Windows / Mac » : affiche la marche à suivre et les images du système choisi.
// Le système est pré-choisi d'après l'adresse (?os=mac) ou l'ordinateur du visiteur.
export function AideAvertissements() {
  const [os, setOs] = useState<Systeme>('windows')

  useEffect(() => {
    try {
      const demande = new URLSearchParams(window.location.search).get('os')
      if (demande === 'mac' || demande === 'windows') setOs(demande)
      else if (/Macintosh|iPhone|iPad/.test(navigator.userAgent)) setOs('mac')
    } catch {
      // adresse illisible : on reste sur Windows
    }
  }, [])

  const bouton = (valeur: Systeme, texte: string) => (
    <button
      type="button"
      onClick={() => setOs(valeur)}
      aria-pressed={os === valeur}
      className={`rounded-lg border px-5 py-2.5 font-semibold ${os === valeur ? 'border-transparent text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
      style={os === valeur ? { backgroundColor: '#8c9e8b' } : undefined}
    >
      {texte}
    </button>
  )

  return (
    <>
      <h2 id="avertissements" className="mt-12 scroll-mt-6 text-xl font-bold">Un message s&apos;affiche au téléchargement ou à l&apos;ouverture ?</h2>
      <p className="mt-2 text-gray-600">
        C&apos;est normal et sans danger. Choisissez votre ordinateur pour voir quoi faire :
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="font-semibold">Besoin d&apos;aide sur :</span>
        {bouton('windows', 'Windows')}
        {bouton('mac', 'Mac')}
      </div>

      {os === 'windows' ? (
        <>
          <p className="mt-4 text-gray-600">
            Le programme est signé par <strong>Levad</strong> : vérifiez que l&apos;éditeur affiché est bien <strong>Levad</strong>, puis confirmez comme ci-dessous.
          </p>
          <h3 className="mt-6 font-semibold">1. Dans votre navigateur (au téléchargement)</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={carte}>
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
            <div className={carte}>
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
          <div className={`mt-3 ${carte}`}>
            <ol className="list-decimal space-y-1 pl-5 text-gray-600">
              <li>Si « Windows a protégé votre ordinateur » apparaît, cliquez sur <strong>Informations complémentaires</strong>.</li>
              <li>Vérifiez que l&apos;<strong>Éditeur</strong> indiqué est <strong>Levad</strong>.</li>
              <li>Cliquez sur <strong>Exécuter quand même</strong>.</li>
            </ol>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-gray-600">
            Sur Mac, l&apos;application n&apos;est pas encore validée par Apple : macOS prévient donc la première fois. C&apos;est sans danger, il suffit de l&apos;autoriser une fois.
          </p>
          <h3 className="mt-6 font-semibold">1. Au téléchargement</h3>
          <div className={`mt-3 ${carte}`}>
            <ul className="list-disc space-y-1 pl-5 text-gray-600">
              <li><strong>Safari</strong> : si Safari demande « Autoriser les téléchargements ? », cliquez sur <strong>Autoriser</strong>.</li>
              <li><strong>Google Chrome</strong> : si « Téléchargement suspect bloqué » s&apos;affiche, cliquez dessus puis sur <strong>Télécharger le fichier suspect</strong> (et non sur « Supprimer de l&apos;historique »).</li>
            </ul>
          </div>
          <h3 className="mt-8 font-semibold">2. À l&apos;ouverture de l&apos;application</h3>
          <div className={`mt-3 ${carte}`}>
            <ol className="list-decimal space-y-2 pl-5 text-gray-600">
              <li>Ouvrez le dossier compressé (zip) téléchargé : un dossier « Levad-Connect-… » apparaît. Double-cliquez sur l&apos;application <strong>Levad Connect</strong> qu&apos;il contient.</li>
              <li>Si macOS indique qu&apos;<strong>Apple n&apos;a pas pu vérifier</strong> l&apos;application, cliquez sur <strong>Terminé</strong>.</li>
              <li>Ouvrez le <strong>menu Pomme</strong>, puis <strong>Réglages Système</strong>, puis <strong>Confidentialité et sécurité</strong>.</li>
              <li>Descendez en bas de la page et cliquez sur <strong>Ouvrir quand même</strong> à côté de « Levad Connect ». Confirmez avec votre mot de passe ou Touch ID.</li>
              <li>Cliquez sur <strong>Installer</strong>. Si le Mac demande l&apos;accès au <strong>réseau local</strong>, acceptez : c&apos;est nécessaire pour trouver vos copieurs.</li>
            </ol>
          </div>
        </>
      )}
      <p className="mt-4 text-sm text-gray-500">
        Ces messages disparaissent avec le temps, à mesure que le programme est téléchargé. Une difficulté ? Contactez votre
        interlocuteur chez LEVAD.
      </p>
    </>
  )
}
