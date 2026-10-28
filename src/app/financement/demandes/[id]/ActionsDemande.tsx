'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

interface Sig { prenom: string; nom: string; email: string }
const champ = 'border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white'

export default function ActionsDemande(p: {
  id: number
  interne: boolean
  statutsAccessibles: { valeur: string; libelle: string }[]
  peutModifier: boolean
  peutArchiver: boolean
  archivee: boolean
  peutSupprimer: boolean
  peutAnnuler: boolean
  peutSignature: boolean
  signataires: { client: Sig; fournisseur: Sig }
}) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [infos, setInfos] = useState('')
  const [ref, setRef] = useState('')
  const [client, setClient] = useState(p.signataires.client)
  const [fournisseur, setFournisseur] = useState(p.signataires.fournisseur)
  const [ouvertSignature, setOuvertSignature] = useState(false)

  async function agir(fn: () => Promise<unknown>) {
    setErreur(null)
    try {
      await fn()
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    }
  }

  const url = `/api/financement/demandes/${p.id}`
  const avancer = p.statutsAccessibles.filter(s => s.valeur !== 'ANNULEE')
  const demandeInfos = avancer.some(s => s.valeur === 'INFOS_MANQUANTES')

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4">
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erreur}</p>}

      {avancer.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Mettre à jour le statut</p>
          {demandeInfos && <textarea className={`${champ} w-full h-16`} placeholder="Si « Informations manquantes » : pièces ou informations demandées par le financeur" value={infos} onChange={e => setInfos(e.target.value)} />}
          <div className="flex flex-wrap gap-2 items-center">
            <input className={`${champ} flex-1 min-w-[12rem]`} placeholder="Commentaire (facultatif)" value={commentaire} onChange={e => setCommentaire(e.target.value)} />
            {p.interne && <input className={`${champ} w-48`} placeholder="N° de dossier financeur" value={ref} onChange={e => setRef(e.target.value)} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {avancer.map(s => (
              <button key={s.valeur} className="bg-gray-900 text-white rounded-lg px-3 py-1.5 text-sm" onClick={() => agir(async () => {
                await appel(`${url}/statut`, 'POST', { statut: s.valeur, commentaire, infosManquantes: infos, refFinanceur: ref })
                setCommentaire(''); setInfos('')
              })}>→ {s.libelle}</button>
            ))}
          </div>
        </div>
      )}

      {p.peutSignature && (
        <div className="space-y-2">
          <button className="bg-violet-700 text-white rounded-lg px-3 py-1.5 text-sm font-semibold" onClick={() => setOuvertSignature(!ouvertSignature)}>Envoyer en signature</button>
          {ouvertSignature && (
            <div className="grid gap-3 sm:grid-cols-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
              <p className="sm:col-span-2 text-xs text-violet-900">Indiquez ici qui signe, côté client et côté LEVAD (prénom, nom et e-mail obligatoires).</p>
              {([['Signataire client', client, setClient], ['Signataire LEVAD', fournisseur, setFournisseur]] as const).map(([titre, s, set]) => (
                <fieldset key={titre} className="space-y-1.5">
                  <legend className="text-sm font-medium text-gray-800">{titre}</legend>
                  <input className={`${champ} w-full`} placeholder="Prénom" value={s.prenom} onChange={e => set({ ...s, prenom: e.target.value })} />
                  <input className={`${champ} w-full`} placeholder="Nom" value={s.nom} onChange={e => set({ ...s, nom: e.target.value })} />
                  <input className={`${champ} w-full`} type="email" placeholder="E-mail" value={s.email} onChange={e => set({ ...s, email: e.target.value })} />
                </fieldset>
              ))}
              <div className="sm:col-span-2 flex items-center gap-3">
                <button className="bg-violet-700 text-white rounded-lg px-4 py-1.5 text-sm font-semibold" onClick={() => agir(async () => { await appel(`${url}/signature`, 'POST', { client, fournisseur }); setOuvertSignature(false) })}>Valider l’envoi en signature</button>
                <span className="text-xs text-gray-500">Avec le connecteur manuel, la signature se lance sur le portail du financeur ; ces informations sont enregistrées ici.</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm border-t border-gray-100 pt-3">
        {p.peutModifier && <Link href={`/financement/demandes/${p.id}/modifier`} className={`${champ} font-medium`}>Modifier</Link>}
        {p.peutAnnuler && <button className={`${champ} text-red-700`} onClick={() => confirm('Annuler cette demande ?') && agir(() => appel(`${url}/statut`, 'POST', { statut: 'ANNULEE', commentaire }))}>Annuler la demande</button>}
        {p.peutArchiver && <button className={champ} onClick={() => agir(() => appel(`${url}/archiver`, 'POST', { archivee: !p.archivee }))}>{p.archivee ? 'Désarchiver' : 'Archiver'}</button>}
        {p.peutSupprimer && <button className={`${champ} text-red-700`} onClick={() => confirm('Supprimer définitivement cette demande et son historique ?') && agir(async () => { await appel(url, 'DELETE'); router.push('/financement') })}>Supprimer</button>}
      </div>
    </div>
  )
}
