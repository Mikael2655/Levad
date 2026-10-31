'use client'

import { useState } from 'react'
import { appel } from '../appel'

export default function FormulaireMotDePasse({ obligatoire }: { obligatoire: boolean }) {
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    if (nouveau !== confirmation) return setErreur('Les deux nouveaux mots de passe sont différents.')
    try {
      await appel('/api/financement/mot-de-passe', 'POST', { ancien, nouveau })
      setFait(true)
      if (obligatoire) window.location.href = '/financement/accueil'
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  const champ = 'w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leasing-700'
  return (
    <form onSubmit={soumettre} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h1 className="font-bold text-gray-900">{obligatoire ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe'}</h1>
      {obligatoire && <p className="text-sm text-gray-600">Le mot de passe provisoire doit être remplacé avant de continuer (10 caractères minimum).</p>}
      <input type="password" placeholder={obligatoire ? 'Mot de passe provisoire' : 'Mot de passe actuel'} value={ancien} onChange={e => setAncien(e.target.value)} autoComplete="current-password" required className={champ} />
      <input type="password" placeholder="Nouveau mot de passe" value={nouveau} onChange={e => setNouveau(e.target.value)} autoComplete="new-password" required className={champ} />
      <input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" required className={champ} />
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      {fait && !obligatoire && <p className="text-sm text-green-700">Mot de passe modifié.</p>}
      <button type="submit" className="w-full bg-leasing-700 hover:bg-leasing-800 text-white transition rounded-md py-2.5 text-sm font-semibold">Enregistrer</button>
    </form>
  )
}
