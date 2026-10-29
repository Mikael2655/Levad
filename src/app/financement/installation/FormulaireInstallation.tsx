'use client'

import { useState } from 'react'
import { appel } from '../appel'

const champ = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm'

export default function FormulaireInstallation() {
  const [v, setV] = useState({ code: '', prenom: '', nom: '', email: '' })
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState<{ email: string; motDePasseProvisoire: string } | null>(null)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    try {
      setFait(await appel('/api/financement/installation', 'POST', v))
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  if (fait) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-6 space-y-3 text-sm">
        <h1 className="font-bold text-gray-900">Installation terminée</h1>
        <p>Compte administrateur : <b>{fait.email}</b></p>
        <p>Mot de passe provisoire : <b className="font-mono text-base select-all">{fait.motDePasseProvisoire}</b></p>
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Notez-le maintenant : il ne sera plus affiché. Vous devrez le remplacer à la première connexion. Supprimez ensuite la variable FIN_INSTALL_CODE de Vercel.</p>
        <a className="underline text-leasing-700" href="/financement/connexion">Aller à la connexion</a>
      </div>
    )
  }

  return (
    <form onSubmit={soumettre} className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-6 space-y-3">
      <h1 className="font-bold text-gray-900">Installation de l’outil de financement</h1>
      <p className="text-sm text-gray-500">Crée le premier administrateur, le financeur Grenke et ses barèmes de départ. Cette page se verrouille ensuite d’elle-même.</p>
      <input className={champ} type="password" placeholder="Code d’installation (variable FIN_INSTALL_CODE)" value={v.code} onChange={e => setV({ ...v, code: e.target.value })} required />
      <input className={champ} placeholder="Prénom" value={v.prenom} onChange={e => setV({ ...v, prenom: e.target.value })} required />
      <input className={champ} placeholder="Nom" value={v.nom} onChange={e => setV({ ...v, nom: e.target.value })} required />
      <input className={champ} type="email" placeholder="Adresse e-mail (votre identifiant)" value={v.email} onChange={e => setV({ ...v, email: e.target.value })} required />
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <button className="w-full bg-leasing-700 text-white rounded-xl py-2.5 text-sm font-semibold">Installer</button>
    </form>
  )
}
