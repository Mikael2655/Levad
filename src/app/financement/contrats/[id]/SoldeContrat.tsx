'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'
import { TitreSection } from '../../Fiche'
import { dateFr, euros } from '../../format'

interface Rachat {
  id: number; type: string; dateResiliation: string; nbLoyersRestants: number; totalCentimes: number; statut: string; envoyeLe: string | null; commentaire: string | null; creeLe: string
  loyersRestantsCentimes?: number; penaliteCentimes?: number; valeurResiduelleCentimes?: number
  demande: { id: number; reference: string } | null
}
interface Simulation { nbLoyersRestants: number; totalCentimes: number; loyersRestantsCentimes?: number; penaliteCentimes?: number; valeurResiduelleCentimes?: number }

const TYPES = [
  ['RENOUVELANT', 'Solde renouvelant (loyers restants + valeur résiduelle de 1 %)'],
  ['NON_RENOUVELANT', 'Solde non renouvelant (loyers restants + pénalité de 10 % + valeur résiduelle de 1 %)'],
] as const
const LIBELLE_TYPE: Record<string, string> = { RENOUVELANT: 'Solde renouvelant', NON_RENOUVELANT: 'Solde non renouvelant' }
const LIBELLE_STATUT: Record<string, string> = { SIMULEE: 'Enregistrée', ENVOYEE: 'Envoyée au financeur', SIGNEE: 'Signée', ANNULEE: 'Annulée' }
const champ = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400 focus:border-leasing-400 transition'

export default function SoldeContrat(p: { contratId: number; enCours: boolean; peutEnvoyer: boolean; peutAnnuler: boolean; rachats: Rachat[] }) {
  const router = useRouter()
  const [type, setType] = useState('RENOUVELANT')
  const [date, setDate] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [sim, setSim] = useState<Simulation | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function agir(fn: () => Promise<unknown>) {
    setErreur(null); setInfo(null)
    try { await fn(); router.refresh() } catch (e) { setErreur((e as Error).message) }
  }
  const url = `/api/financement/contrats/${p.contratId}/solde`
  const detail = (s: Simulation) => s.loyersRestantsCentimes !== undefined && (
    <ul className="text-sm text-gray-700 mt-1 space-y-0.5">
      <li>Loyers restants : {s.nbLoyersRestants} → {euros(s.loyersRestantsCentimes)}</li>
      {!!s.penaliteCentimes && <li>Pénalité de 10 % : {euros(s.penaliteCentimes)}</li>}
      <li>Valeur résiduelle (1 % du montant financé réel) : {euros(s.valeurResiduelleCentimes ?? 0)}</li>
    </ul>
  )

  return (
    <section className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5 space-y-3">
      <TitreSection icone="🔄">Solde anticipé (rachat du contrat)</TitreSection>
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erreur}</p>}
      {info && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{info}</p>}

      {p.enCours ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3 items-end text-sm">
            <label className="min-w-[16rem] flex-1">Type de solde<br /><select className={`${champ} w-full`} value={type} onChange={e => { setType(e.target.value); setSim(null) }}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label>Date de résiliation souhaitée<br /><input type="date" className={champ} value={date} onChange={e => { setDate(e.target.value); setSim(null) }} /></label>
            <button className="bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition px-4 py-1.5" onClick={() => agir(async () => setSim(await appel<Simulation>(url, 'POST', { type, dateResiliation: date })))}>Simuler</button>
          </div>
          {sim && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
              <p className="text-sm text-sky-900">Montant du solde : <b className="text-lg">{euros(sim.totalCentimes)}</b> HT</p>
              {detail(sim) || <p className="text-xs text-sky-800">{sim.nbLoyersRestants} loyer(s) restant(s) à la date choisie.</p>}
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <input className={`${champ} flex-1 min-w-[12rem]`} placeholder="Commentaire (facultatif)" value={commentaire} onChange={e => setCommentaire(e.target.value)} />
                <button className="bg-leasing-700 hover:bg-leasing-800 text-white transition rounded-lg px-4 py-1.5 text-sm font-semibold" onClick={() => agir(async () => { await appel(url, 'POST', { type, dateResiliation: date, commentaire, enregistrer: true }); setSim(null); setCommentaire(''); setInfo('Demande de solde enregistrée.') })}>Enregistrer la demande</button>
              </div>
            </div>
          )}
        </div>
      ) : <p className="text-sm text-gray-500">Le solde anticipé ne concerne que les contrats en cours.</p>}

      {p.rachats.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium text-gray-700">Demandes de solde</p>
          {p.rachats.map(r => (
            <div key={r.id} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                <b>{LIBELLE_TYPE[r.type] ?? r.type}</b>
                <span>résiliation au {dateFr(r.dateResiliation)}</span>
                <span>{euros(r.totalCentimes)} HT</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.statut === 'SIGNEE' ? 'bg-green-100 text-green-800' : r.statut === 'ENVOYEE' ? 'bg-violet-100 text-violet-800' : r.statut === 'ANNULEE' ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-800'}`}>{LIBELLE_STATUT[r.statut] ?? r.statut}</span>
                <span className="text-gray-400">enregistrée le {dateFr(r.creeLe)}</span>
              </div>
              {detail(r)}
              {r.commentaire && <p className="text-gray-500 mt-1">{r.commentaire}</p>}
              {r.demande && <p className="mt-1">Intégré à la demande de renouvellement <Link className="underline text-leasing-700 font-medium" href={`/financement/demandes/${r.demande.id}`}>{r.demande.reference}</Link>.</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {!r.demande && (r.statut === 'SIMULEE' || r.statut === 'ENVOYEE') && <Link href={`/financement/demandes/nouvelle?rachat=${r.id}`} className="bg-emerald-700 text-white rounded-lg px-3 py-1 text-xs font-semibold">Créer la demande de renouvellement (rachat intégré)</Link>}
                {p.peutEnvoyer && r.statut === 'SIMULEE' && !r.demande && <button className="bg-violet-700 text-white rounded-lg px-3 py-1 text-xs font-semibold" onClick={() => agir(async () => { await appel(`/api/financement/rachats/${r.id}`, 'POST', { action: 'envoyer' }); setInfo('Demande envoyée par e-mail.') })}>Envoyer la demande au financeur</button>}
                {p.peutEnvoyer && r.statut === 'ENVOYEE' && <button className="bg-emerald-700 text-white rounded-lg px-3 py-1 text-xs font-semibold" onClick={() => confirm('Offre de rachat signée : le contrat sera clôturé à la date de résiliation. Confirmer ?') && agir(() => appel(`/api/financement/rachats/${r.id}`, 'POST', { action: 'statut', statut: 'SIGNEE' }))}>Offre signée : clôturer le contrat</button>}
                {((p.peutEnvoyer && (r.statut === 'SIMULEE' || r.statut === 'ENVOYEE')) || (p.peutAnnuler && r.statut === 'SIMULEE')) && <button className={`${champ} text-red-700 !py-1 text-xs`} onClick={() => agir(() => appel(`/api/financement/rachats/${r.id}`, 'POST', { action: 'statut', statut: 'ANNULEE' }))}>Annuler</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!p.peutEnvoyer && <p className="text-xs text-gray-500">Seuls l’administrateur et l’assistante envoient la demande au financeur.</p>}
    </section>
  )
}
