'use client'

import { useState } from 'react'
import { appel, bpVersPourcent } from '../../appel'

const bouton = 'border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50'
const euros = (centimes: number) => (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const pct = (bp: number) => `${bpVersPourcent(bp)} %`

export default function MajBareme({ prete }: { prete: boolean }) {
  const [plan, setPlan] = useState<any>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  async function lancer(action: 'bareme-simuler' | 'bareme-appliquer') {
    if (action === 'bareme-appliquer' && !window.confirm('Appliquer ces changements aux barèmes ? Les loyers calculés ensuite utiliseront les nouveaux coefficients.')) return
    setErreur(null); setMessage(null); setOccupe(true)
    try {
      const r = await appel('/api/financement/admin/grenke', 'POST', { action })
      setPlan(r)
      if (action === 'bareme-appliquer') setMessage('Barèmes mis à jour. Vous pouvez relancer « Comparer les calculs et les durées » : les écarts doivent avoir disparu.')
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const ajoutsCommerciaux = plan ? plan.commerciales.flatMap((c: any) => c.ajouts.map((a: any) => ({ ...a, libelle: c.libelle }))) : []
  return (
    <div className="carte p-5 sm:p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Mettre à jour les barèmes depuis Grenke</h2>
      <p className="text-sm text-gray-500">
        Interroge le calculateur de Grenke (sans engagement) et en déduit les coefficients du <b>barème réel</b>. Ajoute aussi les durées 18, 24 et 30 mois.
        Pour ces nouvelles durées, les commerciaux reçoivent la <b>même majoration</b> que sur les autres durées ; leurs coefficients existants ne sont <b>pas modifiés</b>.
        Commencez toujours par une simulation : rien n’est écrit tant que vous n’appuyez pas sur « Appliquer ».
      </p>
      <div className="flex flex-wrap gap-2">
        <button disabled={!prete || occupe} className={bouton} onClick={() => lancer('bareme-simuler')}>Simuler</button>
        <button disabled={!prete || occupe || !plan || (plan.reelle.changements.length === 0 && ajoutsCommerciaux.length === 0)} className="bg-accent-700 hover:bg-accent-800 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-40" onClick={() => lancer('bareme-appliquer')}>Appliquer</button>
      </div>
      {occupe && <p className="text-sm text-gray-500">Interrogation de Grenke en cours…</p>}
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{erreur}</p>}
      {message && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{message}</p>}

      {plan && (
        <div className="space-y-4 text-sm">
          {plan.controle.loyerTrimestrielGrenke != null && <p>Contrôle : pour <b>5 000 €</b> sur 36 mois (12 trimestres), Grenke donne <b>{plan.controle.loyerTrimestrielGrenke.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</b> par trimestre.</p>}
          {plan.reelle.anomalies.map((a: string) => <p key={a} className="text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">{a}</p>)}
          {plan.reelle.durees.inchangees.length > 0 && <p className="text-gray-600">Durées de votre barème que Grenke ne propose pas (laissées telles quelles) : {plan.reelle.durees.inchangees.join(', ')} mois.</p>}
          {plan.reelle.durees.ajoutees.length > 0 && <p>Durées ajoutées : <b>{plan.reelle.durees.ajoutees.join(', ')} mois</b>.</p>}

          <div>
            <h3 className="font-medium text-gray-900 mb-1">Barème réel : {plan.reelle.changements.length} coefficient(s) {message ? 'modifié(s)' : 'à modifier'}</h3>
            {plan.reelle.changements.length === 0 ? <p className="text-gray-500">Aucun changement : votre barème réel est déjà conforme à Grenke.</p> : (
              <div className="overflow-x-auto max-h-80">
                <table className="w-full"><thead><tr className="text-left text-gray-500"><th className="p-1.5">Durée</th><th className="p-1.5">À partir de</th><th className="p-1.5 text-right">Avant</th><th className="p-1.5 text-right">Après</th></tr></thead>
                  <tbody>{plan.reelle.changements.map((c: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100"><td className="p-1.5">{c.dureeMois} mois</td><td className="p-1.5">{euros(c.montantMinCentimes)}</td><td className="p-1.5 text-right">{c.ancienBp == null ? <span className="text-gray-400">nouvelle durée</span> : pct(c.ancienBp)}</td><td className="p-1.5 text-right font-medium">{pct(c.nouveauBp)}</td></tr>
                  ))}</tbody></table>
              </div>
            )}
            {plan.reelle.changements.some((c: any) => c.ancienBp != null) && <p className="mt-2 text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">Les coefficients commerciaux existants restent inchangés : votre marge sur les durées existantes évolue donc de l’écart ci-dessus.</p>}
          </div>

          {ajoutsCommerciaux.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Barèmes commerciaux : {ajoutsCommerciaux.length} ligne(s) ajoutée(s)</h3>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full"><thead><tr className="text-left text-gray-500"><th className="p-1.5">Barème</th><th className="p-1.5">Durée</th><th className="p-1.5">À partir de</th><th className="p-1.5 text-right">Coefficient trimestriel</th><th className="p-1.5 text-right">Majoration</th></tr></thead>
                  <tbody>{ajoutsCommerciaux.map((a: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100"><td className="p-1.5">{a.libelle}</td><td className="p-1.5">{a.dureeMois} mois</td><td className="p-1.5">{euros(a.montantMinCentimes)}</td><td className="p-1.5 text-right font-medium">{pct(a.coefficientBp)}</td><td className="p-1.5 text-right">+{bpVersPourcent(a.majorationBp)} pt</td></tr>
                  ))}</tbody></table>
              </div>
            </div>
          )}
          {plan.commerciales.flatMap((c: any) => c.avertissements.map((a: string) => <p key={c.cle + a} className="text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">{c.libelle} : {a}</p>))}
        </div>
      )}
    </div>
  )
}
