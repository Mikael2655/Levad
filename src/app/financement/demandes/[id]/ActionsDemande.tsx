'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ETAPES_SIGNATURE, LIBELLES_ETAPE } from '@/lib/financement/etapes'
import { appel, eurosVersCentimes } from '../../appel'

interface Sig { prenom: string; nom: string; email: string }
const champ = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400 focus:border-leasing-400 transition'

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
  saisieMontantReel: boolean // financeur sans barème réel : on saisit le montant communiqué par le financeur
  miseEnPlace: boolean // financeur sans signature électronique : on enregistre la mise en place du contrat
  peutRenvoyerMail: boolean
  montantReelActuel: number | null
  etapeSignature: string | null // non nul seulement quand la demande est « En signature »
  signataires: { client: Sig; fournisseur: Sig }
}) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  const [infoOk, setInfoOk] = useState<string | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [infos, setInfos] = useState('')
  const [ref, setRef] = useState('')
  const [montantReel, setMontantReel] = useState(p.montantReelActuel != null ? String(p.montantReelActuel / 100).replace('.', ',') : '')
  const [banque, setBanque] = useState('')
  const [debut, setDebut] = useState('')
  const [client, setClient] = useState(p.signataires.client)
  const [fournisseur, setFournisseur] = useState(p.signataires.fournisseur)
  const [ouvertSignature, setOuvertSignature] = useState(false)
  const [etape, setEtape] = useState(p.etapeSignature ?? 'DEMARRAGE')

  async function agir(fn: () => Promise<unknown>) {
    setErreur(null)
    setInfoOk(null)
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
    <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5 space-y-4">
      {infoOk && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{infoOk}</p>}
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erreur}</p>}

      {avancer.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Mettre à jour le statut</p>
          {demandeInfos && <textarea className={`${champ} w-full h-16`} placeholder="Si « Informations manquantes » : pièces ou informations demandées par le financeur" value={infos} onChange={e => setInfos(e.target.value)} />}
          <div className="flex flex-wrap gap-2 items-center">
            <input className={`${champ} flex-1 min-w-[12rem]`} placeholder="Commentaire (facultatif)" value={commentaire} onChange={e => setCommentaire(e.target.value)} />
            {p.interne && <input className={`${champ} w-48`} placeholder="N° de dossier financeur" value={ref} onChange={e => setRef(e.target.value)} />}
            {p.saisieMontantReel && <input className={`${champ} w-56`} inputMode="decimal" placeholder="Montant financé réel (€)" value={montantReel} onChange={e => setMontantReel(e.target.value)} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {avancer.map(s => (
              <button key={s.valeur} className="bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition px-3 py-1.5 text-sm" onClick={() => agir(async () => {
                await appel(`${url}/statut`, 'POST', { statut: s.valeur, commentaire, infosManquantes: infos, refFinanceur: ref, ...(p.saisieMontantReel && montantReel.trim() ? { montantReelCentimes: eurosVersCentimes(montantReel) } : {}) })
                setCommentaire(''); setInfos('')
              })}>→ {s.libelle}</button>
            ))}
          </div>
        </div>
      )}

      {p.miseEnPlace && (
        <div className="space-y-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-sm font-medium text-emerald-900">Contrat mis en place (pas de signature dans l’outil pour ce financeur)</p>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs text-gray-600">Montant financé réel (€)<br /><input className={`${champ} w-40`} inputMode="decimal" value={montantReel} onChange={e => setMontantReel(e.target.value)} /></label>
            <label className="text-xs text-gray-600">Banque<br /><input className={`${champ} w-44`} value={banque} onChange={e => setBanque(e.target.value)} /></label>
            <label className="text-xs text-gray-600">Date du 1er loyer<br /><input type="date" className={champ} value={debut} onChange={e => setDebut(e.target.value)} /></label>
            <button className="bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-sm font-semibold" onClick={() => agir(() => appel(`${url}/mise-en-place`, 'POST', { montantReelCentimes: eurosVersCentimes(montantReel), banque, dateDebut: debut }))}>Enregistrer le contrat</button>
          </div>
          <p className="text-xs text-gray-500">La date de fin est calculée à partir du 1er loyer et de la durée. Le contrat apparaît ensuite dans « Contrats ».</p>
        </div>
      )}

      {p.etapeSignature !== null && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Où en est la signature ?</p>
          <div className="flex flex-wrap gap-2 items-center">
            <select className={champ} value={etape} onChange={e => setEtape(e.target.value)}>
              {ETAPES_SIGNATURE.map(e => <option key={e} value={e}>{LIBELLES_ETAPE[e]}</option>)}
            </select>
            <button className="bg-violet-700 text-white rounded-lg px-3 py-1.5 text-sm" onClick={() => agir(() => appel(`${url}/etape`, 'POST', { etape }))}>Mettre à jour l’étape</button>
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
        {p.peutRenvoyerMail && <button className={champ} onClick={() => agir(async () => { await appel(`${url}/renvoyer-mail`, 'POST', {}); setInfoOk('E-mail renvoyé.') })}>Renvoyer le mail au financeur</button>}
        {p.peutModifier && <Link href={`/financement/demandes/${p.id}/modifier`} className={`${champ} font-medium`}>Modifier</Link>}
        {p.peutAnnuler && <button className={`${champ} text-red-700`} onClick={() => confirm('Annuler cette demande ?') && agir(() => appel(`${url}/statut`, 'POST', { statut: 'ANNULEE', commentaire }))}>Annuler la demande</button>}
        {p.peutArchiver && <button className={champ} onClick={() => agir(() => appel(`${url}/archiver`, 'POST', { archivee: !p.archivee }))}>{p.archivee ? 'Désarchiver' : 'Archiver'}</button>}
        {p.peutSupprimer && <button className={`${champ} text-red-700`} onClick={() => confirm('Supprimer définitivement cette demande et son historique ?') && agir(async () => { await appel(url, 'DELETE'); router.push('/financement') })}>Supprimer</button>}
      </div>
    </div>
  )
}
