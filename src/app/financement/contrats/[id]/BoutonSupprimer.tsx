'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { appel } from '../../appel'

// Suppression d'un contrat, protégée par trois confirmations successives : 1) « Êtes-vous sûr ? », 2) « Action irréversible »
// avec ce qui sera perdu, 3) saisie du mot SUPPRIMER. Le serveur revérifie le mot.
const MOT = 'SUPPRIMER'

export default function BoutonSupprimer({ id, client, avecDemande }: { id: number; client: string; avecDemande: boolean }) {
  const router = useRouter()
  const [etape, setEtape] = useState<0 | 1 | 2 | 3>(0)
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (etape === 0) return
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape' && !envoi) fermer() }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [etape, envoi])

  function fermer() { setEtape(0); setSaisie(''); setErreur(null) }

  async function supprimer() {
    setEnvoi(true)
    setErreur(null)
    try {
      await appel(`/api/financement/contrats/${id}`, 'DELETE', { confirmation: saisie })
      router.push('/financement/contrats')
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
      setEnvoi(false)
    }
  }

  const perdu = (
    <ul className="mt-3 space-y-1.5 text-sm text-gray-600 list-disc pl-5">
      <li>le contrat de <b className="text-gray-900">{client}</b> et toutes ses informations ;</li>
      <li>ses demandes de solde anticipé ;</li>
      {avecDemande && <li>la demande d’origine et tout son historique.</li>}
    </ul>
  )

  return (
    <>
      <button className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors" onClick={() => setEtape(1)}>
        Supprimer le contrat
      </button>

      {etape > 0 && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="titre-suppression">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => !envoi && fermer()} />
          <div className="carte relative w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400" aria-label={`Étape ${etape} sur 3`}>
              {[1, 2, 3].map(n => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= etape ? 'bg-red-500' : 'bg-gray-200'}`} />)}
              <span className="ml-1">{etape}/3</span>
            </div>

            {etape === 1 && (
              <>
                <h2 id="titre-suppression" className="text-lg font-semibold text-gray-900">Êtes-vous sûr de vouloir supprimer ce contrat ?</h2>
                <p className="text-sm text-gray-600">Vous êtes sur le point de supprimer le contrat de <b className="text-gray-900">{client}</b>.</p>
              </>
            )}
            {etape === 2 && (
              <>
                <h2 id="titre-suppression" className="text-lg font-semibold text-red-700">Cette action est irréversible</h2>
                <p className="text-sm text-gray-600">Une fois supprimé, rien ne pourra être récupéré. Seront définitivement effacés :</p>
                {perdu}
                <p className="text-sm text-gray-600">Pour simplement arrêter un contrat, utilisez plutôt « Dénoncer le contrat ».</p>
              </>
            )}
            {etape === 3 && (
              <>
                <h2 id="titre-suppression" className="text-lg font-semibold text-red-700">Dernière confirmation</h2>
                <p className="text-sm text-gray-600">Pour valider la suppression de <b className="text-gray-900">{client}</b>, tapez le mot <b className="font-mono text-gray-900">{MOT}</b> ci-dessous.</p>
                <input autoFocus value={saisie} onChange={e => setSaisie(e.target.value)} placeholder={MOT} autoComplete="off" spellCheck={false}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400" />
              </>
            )}
            {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{erreur}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors" disabled={envoi} onClick={fermer}>Annuler</button>
              {etape < 3 ? (
                <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors" onClick={() => setEtape((etape + 1) as 2 | 3)}>
                  {etape === 1 ? 'Oui, continuer' : 'Je comprends, continuer'}
                </button>
              ) : (
                <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" disabled={saisie !== MOT || envoi} onClick={supprimer}>
                  {envoi ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
