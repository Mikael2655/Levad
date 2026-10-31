'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

interface U { id: number; email: string; prenom: string; nom: string; role: string; actif: boolean; doitChangerMotDePasse: boolean }
const ROLES = [['ADMIN', 'Administrateur'], ['ASSISTANTE', 'Assistante'], ['COMMERCIAL', 'Commercial']]
const champ = 'border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leasing-400 transition'

export default function TableUtilisateurs({ moiId, utilisateurs }: { moiId: number; utilisateurs: U[] }) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  const [secret, setSecret] = useState<{ email: string; motDePasse: string } | null>(null)
  const [nouveau, setNouveau] = useState({ email: '', prenom: '', nom: '', role: 'COMMERCIAL' })

  async function agir(fn: () => Promise<void>) {
    setErreur(null)
    try {
      await fn()
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      {erreur && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{erreur}</p>}
      {secret && (
        <div className="bg-amber-50 border border-amber-300 rounded-md p-4 text-sm space-y-1">
          <p>Mot de passe provisoire de <b>{secret.email}</b> :</p>
          <p className="font-mono text-base select-all">{secret.motDePasse}</p>
          <p className="text-amber-800">À lui communiquer maintenant : il ne sera plus affiché. Il devra le remplacer à sa première connexion.</p>
          <button className="underline" onClick={() => setSecret(null)}>Fermer</button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {utilisateurs.map(u => (
          <div key={u.id} className={`p-4 flex flex-wrap items-center gap-3 ${u.actif ? '' : 'opacity-60'}`}>
            <div className="min-w-[14rem] flex-1">
              <p className="font-medium text-gray-900">{u.prenom} {u.nom}{u.id === moiId && <span className="text-gray-400"> (vous)</span>}</p>
              <p className="text-sm text-gray-500">{u.email}{u.doitChangerMotDePasse && ' · mot de passe provisoire'}</p>
            </div>
            <select className={champ} value={u.role} onChange={e => agir(() => appel(`/api/financement/admin/utilisateurs/${u.id}`, 'PATCH', { role: e.target.value }))}>
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className={`${champ} bg-white`} onClick={() => agir(async () => {
              const r = await appel<{ motDePasseProvisoire: string }>(`/api/financement/admin/utilisateurs/${u.id}/reinitialiser`, 'POST')
              setSecret({ email: u.email, motDePasse: r.motDePasseProvisoire })
            })}>Réinitialiser le mot de passe</button>
            {u.id !== moiId && (
              <button className={`${champ} bg-white`} onClick={() => agir(() => appel(`/api/financement/admin/utilisateurs/${u.id}`, 'PATCH', { actif: !u.actif }))}>
                {u.actif ? 'Désactiver' : 'Réactiver'}
              </button>
            )}
          </div>
        ))}
      </div>

      <form
        className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-end gap-3"
        onSubmit={e => {
          e.preventDefault()
          agir(async () => {
            const r = await appel<{ motDePasseProvisoire: string }>('/api/financement/admin/utilisateurs', 'POST', nouveau)
            setSecret({ email: nouveau.email.toLowerCase(), motDePasse: r.motDePasseProvisoire })
            setNouveau({ email: '', prenom: '', nom: '', role: 'COMMERCIAL' })
          })
        }}
      >
        <p className="w-full font-semibold text-gray-900">Nouvel utilisateur</p>
        <input className={champ} placeholder="Prénom" value={nouveau.prenom} onChange={e => setNouveau({ ...nouveau, prenom: e.target.value })} required />
        <input className={champ} placeholder="Nom" value={nouveau.nom} onChange={e => setNouveau({ ...nouveau, nom: e.target.value })} required />
        <input className={`${champ} min-w-[16rem]`} type="email" placeholder="Adresse e-mail" value={nouveau.email} onChange={e => setNouveau({ ...nouveau, email: e.target.value })} required />
        <select className={champ} value={nouveau.role} onChange={e => setNouveau({ ...nouveau, role: e.target.value })}>
          {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="submit" className="bg-leasing-700 hover:bg-leasing-800 text-white transition rounded-lg px-4 py-1.5 text-sm font-semibold">Créer</button>
      </form>
    </div>
  )
}
