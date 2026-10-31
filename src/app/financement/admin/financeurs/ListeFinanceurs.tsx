'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel, bpVersPourcent, eurosVersCentimes, pourcentVersBp } from '../../appel'

interface F { id: number; nom: string; connecteur: string; actif: boolean; majorationMensuelleBp: number; commissionBp: number | null; fraisDossierCentimes: number; signatureElectronique: boolean; envoiParMail: boolean; destinataireMailId: number | null; baremeCommercialDeId: number | null }
interface D { id: number; nom: string }
const champ = 'border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leasing-400 transition'

function Ligne({ f, destinataires, autres, onErreur }: { f: F | null; destinataires: D[]; autres: D[]; onErreur: (m: string | null) => void }) {
  const router = useRouter()
  const [nom, setNom] = useState(f?.nom ?? '')
  const [majoration, setMajoration] = useState(bpVersPourcent(f?.majorationMensuelleBp ?? 150))
  const [commission, setCommission] = useState(bpVersPourcent(f?.commissionBp))
  const [signature, setSignature] = useState(f?.signatureElectronique ?? true)
  const [parMail, setParMail] = useState(f?.envoiParMail ?? false)
  const [destinataire, setDestinataire] = useState(String(f?.destinataireMailId ?? ''))
  const [emprunt, setEmprunt] = useState(String(f?.baremeCommercialDeId ?? ''))
  const [frais, setFrais] = useState(f ? String(f.fraisDossierCentimes / 100).replace('.', ',') : '0')

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    onErreur(null)
    const donnees = { nom, majorationMensuelleBp: pourcentVersBp(majoration), commissionBp: commission.trim() === '' ? null : pourcentVersBp(commission), fraisDossierCentimes: eurosVersCentimes(frais), signatureElectronique: signature, envoiParMail: parMail, destinataireMailId: destinataire === '' ? null : Number(destinataire), baremeCommercialDeId: emprunt === '' ? null : Number(emprunt) }
    try {
      await (f ? appel(`/api/financement/admin/financeurs/${f.id}`, 'PATCH', donnees) : appel('/api/financement/admin/financeurs', 'POST', { ...donnees, connecteur: 'manuel' }))
      if (!f) setNom('')
      router.refresh()
    } catch (err) {
      onErreur((err as Error).message)
    }
  }

  const etiquette = 'text-xs text-gray-500 block'
  return (
    <form onSubmit={enregistrer} className={`p-4 flex flex-wrap items-end gap-3 ${f && !f.actif ? 'opacity-60' : ''}`}>
      <label className="flex-1 min-w-[10rem]"><span className={etiquette}>{f ? 'Nom' : 'Nouveau financeur'}</span><input className={`${champ} w-full`} value={nom} onChange={e => setNom(e.target.value)} required /></label>
      <label><span className={etiquette}>Majoration mensuelle (%)</span><input className={`${champ} w-28`} value={majoration} onChange={e => setMajoration(e.target.value)} /></label>
      <label><span className={etiquette}>Commission (%) – information</span><input className={`${champ} w-28`} value={commission} onChange={e => setCommission(e.target.value)} /></label>
      <label><span className={etiquette}>Frais de dossier (€)</span><input className={`${champ} w-28`} value={frais} onChange={e => setFrais(e.target.value)} /></label>
      <label className="flex items-center gap-1.5 pb-2 text-sm"><input type="checkbox" checked={signature} onChange={e => setSignature(e.target.checked)} />Signature électronique dans l’outil</label>
      <label className="flex items-center gap-1.5 pb-2 text-sm"><input type="checkbox" checked={parMail} onChange={e => setParMail(e.target.checked)} />Demande transmise par e-mail</label>
      {f && autres.length > 0 && <label><span className={etiquette}>Taux commerciaux repris de</span><select className={`${champ} bg-white`} value={emprunt} onChange={e => setEmprunt(e.target.value)}><option value="">— son propre barème —</option>{autres.filter(x => x.id !== f.id).map(x => <option key={x.id} value={x.id}>{x.nom}</option>)}</select></label>}
      {parMail && <label><span className={etiquette}>E-mail envoyé à</span><select className={`${champ} bg-white`} value={destinataire} onChange={e => setDestinataire(e.target.value)}><option value="">— choisir —</option>{destinataires.map(x => <option key={x.id} value={x.id}>{x.nom}</option>)}</select></label>}
      {f && <span className="text-sm text-gray-500 pb-2">Connecteur : {f.connecteur}</span>}
      <button type="submit" className="bg-leasing-700 hover:bg-leasing-800 text-white transition rounded-lg px-4 py-1.5 text-sm font-semibold">{f ? 'Enregistrer' : 'Ajouter'}</button>
      {f && (
        <button type="button" className={`${champ} bg-white`} onClick={async () => {
          onErreur(null)
          try { await appel(`/api/financement/admin/financeurs/${f.id}`, 'PATCH', { actif: !f.actif }); router.refresh() } catch (err) { onErreur((err as Error).message) }
        }}>{f.actif ? 'Désactiver' : 'Réactiver'}</button>
      )}
    </form>
  )
}

export default function ListeFinanceurs({ financeurs, destinataires }: { financeurs: F[]; destinataires: D[] }) {
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      {erreur && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{erreur}</p>}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {financeurs.map(f => <Ligne key={`${f.id}-${f.nom}-${f.majorationMensuelleBp}-${f.commissionBp}-${f.fraisDossierCentimes}-${f.signatureElectronique}-${f.envoiParMail}-${f.destinataireMailId}-${f.baremeCommercialDeId}`} f={f} destinataires={destinataires} autres={financeurs.map(x => ({ id: x.id, nom: x.nom }))} onErreur={setErreur} />)}
      </div>
      <div className="bg-white rounded-lg border border-gray-200"><Ligne f={null} destinataires={destinataires} autres={[]} onErreur={setErreur} /></div>
    </div>
  )
}
