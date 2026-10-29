'use client'

import { useState } from 'react'
import { appel } from '../../appel'

const bouton = 'border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50'
const euros = (n: number | null) => (n == null ? '—' : n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))

export default function EssaisGrenke({ prete, demandes }: { prete: boolean; demandes: { id: number; reference: string; raisonSociale: string }[] }) {
  const [resultat, setResultat] = useState<{ titre: string; donnees: any } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [demandeId, setDemandeId] = useState(demandes[0] ? String(demandes[0].id) : '')

  async function lancer(titre: string, corps: Record<string, unknown>) {
    setErreur(null); setOccupe(true); setResultat(null)
    try {
      setResultat({ titre, donnees: await appel('/api/financement/admin/grenke', 'POST', corps) })
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const d = resultat?.donnees
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Essais en lecture seule</h2>
        <div className="flex flex-wrap gap-2">
          <button disabled={!prete || occupe} className={bouton} onClick={() => lancer('Connexion', { action: 'connexion' })}>1. Tester la connexion</button>
          <button disabled={!prete || occupe} className={bouton} onClick={() => lancer('Types de biens', { action: 'types' })}>Types de biens</button>
          <button disabled={!prete || occupe} className={bouton} onClick={() => lancer('Mes demandes chez Grenke', { action: 'demandes' })}>Mes demandes</button>
          <button disabled={!prete || occupe} className={bouton} onClick={() => lancer('Mes contrats chez Grenke', { action: 'contrats' })}>Mes contrats</button>
          <button disabled={!prete || occupe} className={bouton} onClick={() => lancer('Comparaison des calculs', { action: 'calculs' })}>Comparer les calculs et les durées</button>
        </div>
        {!prete && <p className="text-sm text-gray-500">Disponible quand la configuration ci-dessus est complète.</p>}
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Aperçu d’une demande (rien n’est envoyé)</h2>
        <p className="text-sm text-gray-500">Montre exactement ce qui partirait chez Grenke : le <b>montant réel</b> réparti sur les matériels, le client, la périodicité.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400 focus:border-leasing-400 transition" value={demandeId} onChange={e => setDemandeId(e.target.value)}>
            {demandes.map(x => <option key={x.id} value={x.id}>{x.reference} · {x.raisonSociale}</option>)}
            {demandes.length === 0 && <option value="">Aucune demande</option>}
          </select>
          <button disabled={!demandeId || occupe} className={bouton} onClick={() => lancer('Aperçu de la demande', { action: 'apercu', demandeId: Number(demandeId) })}>Voir l’aperçu</button>
        </div>
      </div>

      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{erreur}</p>}
      {occupe && <p className="text-sm text-gray-500">En cours…</p>}

      {resultat && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">{resultat.titre}</h2>
          {resultat.titre === 'Comparaison des calculs' && (
            <>
              <p className="text-sm">Durées proposées par Grenke : <b>{d.dureesGrenke.join(', ') || '—'}</b> mois · dans notre barème : <b>{d.dureesNotreBareme.join(', ')}</b></p>
              {d.dureesAbsentesChezNous.length > 0 && <p className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">Durées chez Grenke absentes de notre barème réel : <b>{d.dureesAbsentesChezNous.join(', ')}</b> mois.</p>}
              {d.dureesAbsentesChezGrenke.length > 0 && <p className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">Durées de notre barème absentes chez Grenke : <b>{d.dureesAbsentesChezGrenke.join(', ')}</b> mois.</p>}
              <div className="overflow-x-auto max-h-96">
                <table className="text-sm w-full">
                  <thead><tr className="text-left text-gray-500"><th className="p-1.5">Montant financé</th><th className="p-1.5">Durée</th><th className="p-1.5 text-right">Loyer trimestriel Grenke</th><th className="p-1.5 text-right">Notre barème</th><th className="p-1.5 text-right">Écart</th></tr></thead>
                  <tbody>
                    {d.lignes.map((l: any, i: number) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="p-1.5">{euros(l.montantEuros)}</td><td className="p-1.5">{l.dureeMois} mois</td>
                        <td className="p-1.5 text-right">{euros(l.grenkeTrimestriel)}</td><td className="p-1.5 text-right">{euros(l.notreTrimestriel)}</td>
                        <td className={`p-1.5 text-right ${l.ecartCentimes === null ? 'text-gray-400' : Math.abs(l.ecartCentimes) > 100 ? 'text-red-700 font-semibold' : 'text-green-700'}`}>{l.ecartCentimes === null ? 'n/a' : euros(l.ecartCentimes / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {resultat.titre === 'Aperçu de la demande' && d.avertissements?.length > 0 && <ul className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 list-disc list-inside">{d.avertissements.map((a: string) => <li key={a}>{a}</li>)}</ul>}
          <details open={resultat.titre !== 'Comparaison des calculs'}>
            <summary className="cursor-pointer text-sm text-gray-600">Données brutes</summary>
            <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-96">{JSON.stringify(d, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
