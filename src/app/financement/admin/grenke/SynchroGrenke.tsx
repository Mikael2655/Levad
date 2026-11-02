'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { appel } from '../../appel'

interface Rapport {
  nouveaux: { reference: string; client: string; etatBrut: string }[]
  nouveauxIgnores: { ref: string; client: string; raison: string }[]
  connus: number
  aRemplir: { id: number; ref: string; client: string; champs: string[] }[]
  ecarts: { id: number; ref: string; client: string; champ: string; nous: string; financeur: string }[]
  aCloturer: { id: number; ref: string; client: string; etat: string }[]
  absents: { id: number; ref: string; client: string }[]
  avertissements: string[]
  etats: Record<string, number>
}
interface Resultat { simule: boolean; rapport: Rapport; crees: number; mis_a_jour: number }

const champ = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/40'

export default function SynchroGrenke(p: { prete: boolean; financeurs: { id: number; nom: string }[]; commerciaux: { id: number; nom: string }[] }) {
  const router = useRouter()
  const [financeurId, setFinanceurId] = useState(String(p.financeurs.find(f => /grenke/i.test(f.nom))?.id ?? p.financeurs[0]?.id ?? ''))
  const [commercial, setCommercial] = useState('')
  const [periodicite, setPeriodicite] = useState<'TRIMESTRIELLE' | 'MENSUELLE'>('TRIMESTRIELLE')
  const [res, setRes] = useState<Resultat | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  async function lancer(appliquer: boolean) {
    if (appliquer && !confirm('Appliquer la synchronisation ? Les nouveaux contrats seront créés et les valeurs vides complétées. Rien de ce que vous avez saisi ne sera écrasé.')) return
    setErreur(null); setOccupe(true)
    try {
      setRes(await appel<Resultat>('/api/financement/admin/grenke/synchro', 'POST', { financeurId: Number(financeurId), commercialDefautId: commercial ? Number(commercial) : null, periodicite, appliquer }))
      if (appliquer) router.refresh()
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }
  const r = res?.rapport
  const Bloc = ({ titre, n, aide, children }: { titre: string; n: number; aide: string; children?: React.ReactNode }) => (
    <details className="border border-gray-200 rounded-xl" open={n > 0 && n <= 8}>
      <summary className="cursor-pointer px-4 py-3 flex items-center gap-3"><span className="font-medium text-gray-900">{titre}</span><span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700">{n}</span><span className="text-xs text-gray-500">{aide}</span></summary>
      {n > 0 && <div className="px-4 pb-3 text-sm overflow-x-auto">{children}</div>}
    </details>
  )

  return (
    <div className="carte p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-gray-900">Synchroniser les contrats</h2>
        <p className="text-sm text-gray-500 mt-1">Compare vos contrats avec ceux de Grenke (lecture seule : rien n’est envoyé à Grenke). Commencez toujours par une <b>simulation</b>.</p>
      </div>
      <div className="flex flex-wrap items-end gap-4 text-sm">
        <label>Financeur de l’outil<br /><select className={champ} value={financeurId} onChange={e => setFinanceurId(e.target.value)}>{p.financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
        <label>Commercial des nouveaux contrats<br /><select className={champ} value={commercial} onChange={e => setCommercial(e.target.value)}><option value="">— choisir —</option>{p.commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></label>
        <label>Loyer renvoyé par Grenke<br /><select className={champ} value={periodicite} onChange={e => setPeriodicite(e.target.value as 'TRIMESTRIELLE' | 'MENSUELLE')}><option value="TRIMESTRIELLE">trimestriel</option><option value="MENSUELLE">mensuel</option></select></label>
        <button disabled={!p.prete || occupe} className="border border-gray-300 bg-white hover:bg-gray-50 rounded-xl px-4 py-2 font-medium disabled:opacity-50" onClick={() => lancer(false)}>{occupe ? 'Lecture…' : 'Simuler'}</button>
        <button disabled={!p.prete || occupe || !res?.simule} className="bg-accent-700 hover:bg-accent-800 text-white rounded-xl px-4 py-2 font-semibold disabled:opacity-40" onClick={() => lancer(true)}>Appliquer</button>
      </div>
      {!p.prete && <p className="text-sm text-gray-500">Disponible quand la configuration de l’API est complète.</p>}
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{erreur}</p>}

      {r && (
        <div className="space-y-3">
          {!res!.simule && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">Synchronisation appliquée : {res!.crees} contrat(s) créé(s), {res!.mis_a_jour} mis à jour.</p>}
          {res!.simule && <p className="text-sm text-sky-900 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">Simulation : rien n’a été modifié. {r.connus} contrat(s) déjà connus ({r.nouveaux.length} nouveau(x)). États vus chez Grenke : {Object.entries(r.etats).map(([e, n]) => `${e} (${n})`).join(', ') || '—'}.</p>}
          {r.avertissements.map(a => <p key={a} className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{a}</p>)}
          <Bloc titre="Nouveaux contrats" n={r.nouveaux.length} aide="seront créés (matériel « Non précisé »)">
            <ul className="space-y-1">{r.nouveaux.map(n => <li key={n.reference}>{n.reference} · {n.client} <span className="text-gray-400">({n.etatBrut})</span></li>)}</ul>
          </Bloc>
          <Bloc titre="Valeurs à compléter" n={r.aRemplir.length} aide="champs vides chez nous, remplis depuis Grenke">
            <ul className="space-y-1">{r.aRemplir.map(x => <li key={x.id}>{x.ref} · {x.client} <span className="text-gray-400">→ {x.champs.join(', ')}</span></li>)}</ul>
          </Bloc>
          <Bloc titre="Écarts à vérifier" n={r.ecarts.length} aide="valeurs différentes : NON modifiées, à contrôler">
            <table className="w-full"><thead><tr className="text-left text-xs text-gray-500"><th className="pr-4">Contrat</th><th className="pr-4">Champ</th><th className="pr-4">Dans l’outil</th><th>Chez Grenke</th></tr></thead>
              <tbody>{r.ecarts.map((x, i) => <tr key={i} className="border-t border-gray-100"><td className="pr-4 py-1">{x.ref} · {x.client}</td><td className="pr-4">{x.champ}</td><td className="pr-4">{x.nous}</td><td>{x.financeur}</td></tr>)}</tbody></table>
          </Bloc>
          <Bloc titre="Terminés chez Grenke" n={r.aCloturer.length} aide="proposés seulement : rien n’est clôturé automatiquement">
            <ul className="space-y-1">{r.aCloturer.map(x => <li key={x.id}>{x.ref} · {x.client} <span className="text-gray-400">({x.etat})</span></li>)}</ul>
          </Bloc>
          <Bloc titre="Absents de la réponse de Grenke" n={r.absents.length} aide="dans l’outil mais pas chez Grenke : non modifiés">
            <ul className="space-y-1">{r.absents.map(x => <li key={x.id}>{x.ref} · {x.client}</li>)}</ul>
          </Bloc>
          <Bloc titre="Non repris" n={r.nouveauxIgnores.length} aide="contrats de Grenke volontairement laissés de côté">
            <ul className="space-y-1">{r.nouveauxIgnores.map((x, i) => <li key={i}>{x.ref} · {x.client} <span className="text-gray-400">— {x.raison}</span></li>)}</ul>
          </Bloc>
        </div>
      )}
    </div>
  )
}
