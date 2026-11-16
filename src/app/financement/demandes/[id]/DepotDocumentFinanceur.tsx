'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel, eurosVersCentimes } from '../../appel'

const champ = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition'
type Choix = 'ACCORD' | 'PIECES' | 'REFUS'
interface Infos { numero: string | null; siren: string | null; dureeMois: number | null; loyerCentimes: number | null; coefficient: number | null }
interface Controles { siren: string; loyer: string; duree: string }
interface Montant { valeurCentimes: number; contexte: string; etiquette: 'FINANCE' | 'LOYER' | null }
const eur = (c: number) => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

// Financeur sans API (Solubail...) : on glisse sur la demande le PDF reçu par e-mail. L'outil propose ce que c'est (accord, pièces, refus) ; on vérifie,
// puis on enregistre. Le PDF n'est PAS conservé. Le vrai montant financé de l'accord n'est vu que de l'interne : les commerciaux voient le statut.
export default function DepotDocumentFinanceur({ demandeId, peutAccord, actuelle = '', accordDejaRecu }: { demandeId: number; peutAccord: boolean; actuelle?: string; accordDejaRecu: boolean }) {
  const router = useRouter()
  const [survol, setSurvol] = useState(false)
  const [ouvert, setOuvert] = useState(false)
  const [choix, setChoix] = useState<Choix | null>(null)
  const [liste, setListe] = useState('')
  const [montant, setMontant] = useState('')
  const [note, setNote] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [montants, setMontants] = useState<Montant[]>([])
  const [infos, setInfos] = useState<Infos | null>(null)
  const [controles, setControles] = useState<Controles | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const url = `/api/financement/demandes/${demandeId}`

  const nettoyerListe = (t: string) => t.split('\n').map(l => l.replace(/^[\s•\-]+/, '').trim()).filter(Boolean).join('\n')

  async function analyser(f: File) {
    setErreur(null); setInfo(null); setOccupe(true)
    try {
      const fd = new FormData()
      fd.append('fichier', f)
      const res = await fetch(`${url}/pieces-demandees`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      const lignes = data.lignes as string[]
      if (data.type === 'PIECES' && lignes.length > 0) {
        await appel(`${url}/pieces-demandees`, 'PUT', { lignes })
        setOuvert(false); setInfo(`${lignes.length} pièce(s) demandée(s) enregistrée(s) : ${lignes.join(' · ')}.`)
        router.refresh()
        return
      }
      const trouves = data.montants as Montant[]
      setMontants(trouves)
      const i = (data.infos ?? null) as Infos | null
      setInfos(i); setControles((data.controles ?? null) as Controles | null)
      setNote(i ? [i.numero ? `Accord n° ${i.numero}` : '', i.coefficient ? `coefficient ${String(i.coefficient).replace('.', ',')} %` : ''].filter(Boolean).join(' · ') : '')
      setListe(lignes.join('\n'))
      setMontant((trouves.find(m => m.etiquette === 'FINANCE') ?? null) ? String(trouves.find(m => m.etiquette === 'FINANCE')!.valeurCentimes / 100).replace('.', ',') : '')
      setChoix(data.type === 'ACCORD' && peutAccord ? 'ACCORD' : data.type === 'REFUS' ? 'REFUS' : data.type === 'PIECES' ? 'PIECES' : null)
      setInfo(!data.texteLu ? 'Ce PDF est une image (scan) : rien n’a pu être lu. Choisissez ce que c’est et saisissez à la main.' : data.type === 'INCONNU' ? 'Je ne sais pas dire ce que contient ce PDF : choisissez ci-dessous.' : 'Vérifiez ce que j’ai compris, corrigez si besoin, puis enregistrez.')
      setOuvert(true)
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  async function enregistrer() {
    setErreur(null); setOccupe(true)
    try {
      if (choix === 'ACCORD') {
        const c = eurosVersCentimes(montant)
        if (!Number.isFinite(c) || c <= 0) throw new Error('Indiquez le montant financé de l’accord, en euros.')
        const r = await appel<{ premier: boolean }>(`${url}/accord`, 'POST', { montantReelCentimes: c, note })
        setInfo(r.premier ? 'Accord enregistré : la demande est « Prête à signer ». Les commerciaux voient le statut, pas le montant.' : 'Accord mis à jour (le précédent est conservé dans l’historique des accords).')
      } else if (choix === 'PIECES') {
        await appel(`${url}/pieces-demandees`, 'PUT', { lignes: liste.split('\n') })
        setInfo('Liste des pièces enregistrée : les commerciaux la voient sur la demande.')
      } else if (choix === 'REFUS') {
        await appel(`${url}/statut`, 'POST', { statut: 'REFUSEE', commentaire })
        setInfo('Demande marquée refusée.')
      }
      setOuvert(false); setChoix(null); setMontants([]); setInfos(null); setControles(null); setNote(''); setCommentaire('')
      router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div
      className={`border-t border-gray-100 pt-3 space-y-3 text-sm rounded-xl ${survol ? 'bg-emerald-50 outline outline-2 outline-dashed outline-emerald-400' : ''}`}
      onDragOver={e => { e.preventDefault(); setSurvol(true) }}
      onDragLeave={() => setSurvol(false)}
      onDrop={e => { e.preventDefault(); setSurvol(false); const f = e.dataTransfer.files?.[0]; if (f && !occupe) void analyser(f) }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-600">Réponse du financeur reçue par e-mail ? <b>Glissez ici le PDF</b> (accord, pièces demandées, refus), ou</span>
        <label className={`${champ} cursor-pointer ${occupe ? 'opacity-60' : ''}`}>
          choisir le PDF
          <input type="file" accept="application/pdf" className="hidden" disabled={occupe} onChange={e => { const f = e.target.files?.[0]; if (f) void analyser(f); e.target.value = '' }} />
        </label>
        <button type="button" className="underline text-gray-500" onClick={() => { setOuvert(!ouvert); setChoix(peutAccord ? 'ACCORD' : 'PIECES'); setListe(actuelle.split('\n').map(l => l.replace(/^[\s•\-]+/, '').trim()).filter(Boolean).join('\n')) }}>{ouvert ? 'fermer' : accordDejaRecu ? 'mettre à jour l’accord / saisir à la main' : 'saisir à la main'}</button>
      </div>
      <p className="text-xs text-gray-500">Le PDF n’est pas conservé. Le montant financé d’un accord n’est visible que de l’administrateur et de l’assistante.</p>

      {ouvert && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex flex-wrap gap-4">
            {peutAccord && <label className="flex items-center gap-1.5"><input type="radio" checked={choix === 'ACCORD'} onChange={() => setChoix('ACCORD')} /> Accord{accordDejaRecu ? ' (nouvel accord)' : ''}</label>}
            <label className="flex items-center gap-1.5"><input type="radio" checked={choix === 'PIECES'} onChange={() => setChoix('PIECES')} /> Pièces demandées</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={choix === 'REFUS'} onChange={() => setChoix('REFUS')} /> Refus</label>
          </div>

          {choix === 'ACCORD' && (
            <div className="space-y-2">
              {controles && infos && (
                <ul className="text-xs space-y-0.5">
                  {controles.siren === 'different' && <li className="text-red-700 font-semibold">⚠ SIREN du PDF ({infos.siren}) différent de celui de la demande : vérifiez que c’est le bon PDF et la bonne demande.</li>}
                  {controles.siren === 'ok' && <li className="text-emerald-700">✓ Même client (SIREN {infos.siren})</li>}
                  {controles.loyer === 'different' && <li className="text-amber-700">⚠ Loyer du PDF : {infos.loyerCentimes != null ? eur(infos.loyerCentimes) : ''}, différent de celui de la demande.</li>}
                  {controles.loyer === 'ok' && <li className="text-emerald-700">✓ Même loyer ({infos.loyerCentimes != null ? eur(infos.loyerCentimes) : ''})</li>}
                  {controles.duree === 'different' && <li className="text-amber-700">⚠ Durée du PDF : {infos.dureeMois} mois, différente de celle de la demande.</li>}
                  {controles.duree === 'ok' && <li className="text-emerald-700">✓ Même durée ({infos.dureeMois} mois)</li>}
                </ul>
              )}
              <label className="block"><span className="block font-medium text-gray-700 mb-1">Montant financé de l’accord (€)</span><input className={champ} inputMode="decimal" value={montant} onChange={e => setMontant(e.target.value)} placeholder="ex. 10234,50" /></label>
              {montants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center text-xs text-gray-600">Montants trouvés dans le PDF :
                  {montants.map((m, i) => <button key={i} type="button" title={m.contexte} onClick={() => setMontant(String(m.valeurCentimes / 100).replace('.', ','))} className={`rounded-full border px-2 py-0.5 ${m.etiquette === 'FINANCE' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 bg-white'}`}>{eur(m.valeurCentimes)}{m.etiquette === 'LOYER' ? ' (loyer ?)' : ''}</button>)}
                </div>
              )}
              <label className="block"><span className="block font-medium text-gray-700 mb-1">Note interne (facultatif)</span><input className={champ + ' w-full'} value={note} onChange={e => setNote(e.target.value)} placeholder="ex. coefficient négocié à 2,95 %" /></label>
            </div>
          )}
          {choix === 'PIECES' && <textarea className={`${champ} w-full`} rows={5} value={liste} onChange={e => setListe(e.target.value)} placeholder="Une pièce par ligne : Extrait Kbis de moins de 3 mois…" />}
          {choix === 'REFUS' && <input className={`${champ} w-full`} value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Motif (facultatif)" />}

          {choix && <button type="button" disabled={occupe || (choix === 'PIECES' && !nettoyerListe(liste))} onClick={enregistrer} className="bg-accent-700 hover:bg-accent-800 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">{choix === 'ACCORD' ? 'Enregistrer l’accord' : choix === 'PIECES' ? 'Enregistrer la liste' : 'Marquer refusée'}</button>}
        </div>
      )}
      {info && <p className="text-gray-700">{info}</p>}
      {erreur && <p className="text-red-700">{erreur}</p>}
    </div>
  )
}
