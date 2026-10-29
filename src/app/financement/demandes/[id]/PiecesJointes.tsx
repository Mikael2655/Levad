'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { appel } from '../../appel'
import { dateFr } from '../../format'

interface Piece { envoyeFinanceurLe: string | null; id: number; type: string; nomFichier: string; taille: number; ajouteLe: string; ajouteParId: number; ajouteParNom: string }

const TYPES = [['KBIS', 'Kbis'], ['BILAN', 'Bilan'], ['RIB', 'RIB'], ['IDENTITE', 'Pièce d’identité'], ['AUTRE', 'Autre']] as const
const LIBELLE: Record<string, string> = Object.fromEntries(TYPES)
const MORCEAU = 3 * 1024 * 1024 // doit rester sous la limite de 4,5 Mo par requête
const TAILLE_MAX = 10 * 1024 * 1024
const CONSERVATION_JOURS = 60
const champ = 'border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white'

const taille = (o: number) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`)

export default function PiecesJointes(p: { financeurAvecApi: boolean; demandeId: number; moiId: number; interne: boolean; modifiable: boolean; pieces: Piece[] }) {
  const router = useRouter()
  const [type, setType] = useState('KBIS')
  const [progression, setProgression] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const fichier = useRef<HTMLInputElement>(null)

  async function envoyer(f: File) {
    setErreur(null)
    if (f.size > TAILLE_MAX) return setErreur('Fichier trop volumineux (10 Mo maximum).')
    try {
      setProgression('Préparation…')
      const { id } = await appel<{ id: number }>(`/api/financement/demandes/${p.demandeId}/pieces`, 'POST', { type, nomFichier: f.name, taille: f.size })
      const total = Math.ceil(f.size / MORCEAU)
      for (let i = 0; i < total; i++) {
        setProgression(`Envoi… ${Math.round((i / total) * 100)} %`)
        const res = await fetch(`/api/financement/pieces/${id}/morceau/${i}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f.slice(i * MORCEAU, (i + 1) * MORCEAU) })
        if (!res.ok) {
          await appel(`/api/financement/pieces/${id}`, 'DELETE').catch(() => undefined)
          throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Envoi impossible')
        }
      }
      await appel(`/api/financement/pieces/${id}`, 'POST', { action: 'terminer' })
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setProgression(null)
      if (fichier.current) fichier.current.value = ''
    }
  }

  return (
    <section className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Pièces jointes</h2>
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erreur}</p>}

      {p.pieces.length > 0 ? (
        <ul className="divide-y divide-gray-100 text-sm">
          {p.pieces.map(x => {
            const fin = new Date(new Date(x.ajouteLe).getTime() + CONSERVATION_JOURS * 86_400_000)
            const jours = Math.max(0, Math.ceil((fin.getTime() - Date.now()) / 86_400_000))
            return (
              <li key={x.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">{LIBELLE[x.type] ?? x.type}</span>
                <a className="font-medium text-leasing-700 underline break-all" href={`/api/financement/pieces/${x.id}`}>{x.nomFichier}</a>
                <span className="text-gray-400">{taille(x.taille)}</span>
                <span className="text-gray-400">ajoutée le {dateFr(x.ajouteLe)} par {x.ajouteParNom}</span>
                {p.financeurAvecApi && (x.envoyeFinanceurLe ? <span className="text-emerald-700">envoyée au financeur le {dateFr(x.envoyeFinanceurLe)}</span> : <span className="text-gray-400">pas encore envoyée au financeur</span>)}
                <span className={jours <= 7 ? 'text-amber-700' : 'text-gray-400'}>supprimée automatiquement dans {jours} jour{jours > 1 ? 's' : ''}</span>
                {p.modifiable && (p.interne || x.ajouteParId === p.moiId) && (
                  <button className="ml-auto text-red-700 underline" onClick={async () => {
                    if (!confirm(`Supprimer « ${x.nomFichier} » ?`)) return
                    setErreur(null)
                    try { await appel(`/api/financement/pieces/${x.id}`, 'DELETE'); router.refresh() } catch (e) { setErreur((e as Error).message) }
                  }}>Supprimer</button>
                )}
              </li>
            )
          })}
        </ul>
      ) : <p className="text-sm text-gray-500">Aucune pièce pour le moment.</p>}

      {p.modifiable && (
        <div className="flex flex-wrap items-end gap-3 text-sm border-t border-gray-100 pt-3">
          <label>Type de pièce<br /><select className={champ} value={type} onChange={e => setType(e.target.value)} disabled={progression !== null}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>Fichier (PDF, image, Word, Excel · 10 Mo max)<br />
            <input ref={fichier} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" disabled={progression !== null} className="text-sm" onChange={e => { const f = e.target.files?.[0]; if (f) void envoyer(f) }} />
          </label>
          {progression && <span className="text-gray-600">{progression}</span>}
        </div>
      )}
      <p className="text-xs text-gray-400">Les pièces sont conservées {CONSERVATION_JOURS} jours après leur ajout, puis supprimées automatiquement : téléchargez celles dont vous avez besoin avant.</p>
    </section>
  )
}
