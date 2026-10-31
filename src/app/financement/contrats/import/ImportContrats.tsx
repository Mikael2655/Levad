'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CHAMPS, LIBELLES_CHAMPS, OBLIGATOIRES, colonnesManquantes, detecterUniteLoyer, type Champ, type Mapping, type UniteLoyer } from '@/lib/financement/import-contrats'
import { appel } from '../../appel'
import { euros } from '../../format'

interface Analyse { entetes: string[]; lignes: string[][]; mapping: Mapping }
interface Ligne { numero: number; client: string; ref: string | null; etat: 'OK' | 'DOUBLON' | 'IGNORE' | 'ERREUR'; message?: string; loyerCentimes?: number; montantReelCentimes?: number; montantCommercialCentimes?: number | null; commercialNom?: string }
interface Rapport { simule: boolean; importes: number; doublons: number; ignores: number; erreurs: number; lignes: Ligne[]; tronque: boolean }

const champ = 'border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400 focus:border-leasing-400 transition'
function statutsDistincts(lignes: string[][], colonne: number | undefined): { valeur: string; nombre: number }[] {
  if (colonne === undefined) return []
  const n = new Map<string, number>()
  for (const l of lignes) n.set((l[colonne] ?? '').trim(), (n.get((l[colonne] ?? '').trim()) ?? 0) + 1)
  return Array.from(n, ([valeur, nombre]) => ({ valeur, nombre })).sort((a, b) => b.nombre - a.nombre)
}

const section = 'bg-white rounded-lg border border-gray-200 p-4 sm:p-5 space-y-3'

export default function ImportContrats({ financeurs, commerciaux }: { financeurs: { id: number; nom: string }[]; commerciaux: { id: number; nom: string }[] }) {
  const [financeurId, setFinanceurId] = useState(financeurs.length === 1 ? String(financeurs[0].id) : '')
  const [fichier, setFichier] = useState<File | null>(null)
  const [analyse, setAnalyse] = useState<Analyse | null>(null)
  const [mapping, setMapping] = useState<Mapping>({})
  const [uniteDuree, setUniteDuree] = useState<'MOIS' | 'TRIMESTRES'>('MOIS')
  const [uniteLoyer, setUniteLoyer] = useState<UniteLoyer>('PAR_PERIODE')
  const [statutsRetenus, setStatutsRetenus] = useState<string[]>([])
  const [periodiciteDefaut, setPeriodiciteDefaut] = useState<'TRIMESTRIELLE' | 'MENSUELLE'>('TRIMESTRIELLE')
  const [commercialDefautId, setCommercialDefautId] = useState('')
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  async function analyser() {
    if (!fichier) return setErreur('Choisissez un fichier.')
    setErreur(null); setOccupe(true); setRapport(null)
    try {
      const form = new FormData()
      form.set('fichier', fichier)
      const res = await fetch('/api/financement/contrats/import/analyse', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setAnalyse(data)
      setMapping(data.mapping)
      const suggestion = detecterUniteLoyer(data.lignes, data.mapping, 'MOIS')
      if (suggestion) setUniteLoyer(suggestion)
      setStatutsRetenus(statutsDistincts(data.lignes, data.mapping.statut).map(x => x.valeur))
    } catch (e) {
      setAnalyse(null)
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  async function lancer(simuler: boolean) {
    if (!analyse) return
    setErreur(null); setOccupe(true)
    try {
      const r = await appel<Rapport>('/api/financement/contrats/import', 'POST', {
        financeurId: Number(financeurId), lignes: analyse.lignes, mapping, uniteDuree, uniteLoyer, periodiciteDefaut,
        commercialDefautId: commercialDefautId ? Number(commercialDefautId) : null,
        statutsRetenus: mapping.statut !== undefined ? statutsRetenus : null, simuler,
      })
      setRapport(r)
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const statuts = useMemo(() => (analyse ? statutsDistincts(analyse.lignes, mapping.statut) : []), [analyse, mapping.statut])
  const suggestionLoyer = useMemo(() => (analyse ? detecterUniteLoyer(analyse.lignes, mapping, uniteDuree) : null), [analyse, mapping, uniteDuree])
  const manquants = colonnesManquantes(mapping)
  const modifie = (fn: () => void) => { setRapport(null); fn() }

  return (
    <div className="space-y-4">
      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2">{erreur}</p>}

      <section className={section}>
        <h2 className="font-semibold text-gray-900">1. Fichier à importer</h2>
        <p className="text-sm text-gray-500">Excel (.xlsx) ou CSV, avec une ligne d’en-tête. Un contrat déjà présent (même financeur, même n° de contrat) est ignoré : vous pouvez réimporter sans crainte.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Financeur<br />
            <select className={champ} value={financeurId} onChange={e => modifie(() => setFinanceurId(e.target.value))}>
              <option value="">Choisir…</option>
              {financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </label>
          <input type="file" accept=".xlsx,.csv,.txt" className="text-sm" onChange={e => { setFichier(e.target.files?.[0] ?? null); setAnalyse(null); setRapport(null) }} />
          <button disabled={occupe || !fichier || !financeurId} className="bg-gray-800 hover:bg-gray-900 text-white rounded-md transition px-4 py-1.5 text-sm disabled:opacity-50" onClick={analyser}>Analyser le fichier</button>
        </div>
      </section>

      {analyse && (
        <>
          <section className={section}>
            <h2 className="font-semibold text-gray-900">2. Correspondance des colonnes</h2>
            <p className="text-sm text-gray-500">{analyse.lignes.length} ligne(s) lues. Vérifiez que chaque information est bien associée à la bonne colonne de votre fichier.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CHAMPS.map((c: Champ) => (
                <label key={c} className="text-sm">
                  <span className="text-xs text-gray-600">{LIBELLES_CHAMPS[c]}{OBLIGATOIRES.includes(c) ? ' *' : ''}</span>
                  <select className={`${champ} w-full`} value={mapping[c] ?? ''} onChange={e => modifie(() => setMapping(m => { const n = { ...m }; if (e.target.value === '') delete n[c]; else n[c] = Number(e.target.value); return n }))}>
                    <option value="">— non utilisée —</option>
                    {analyse.entetes.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm pt-1">
              <label>La durée est en<br /><select className={champ} value={uniteDuree} onChange={e => modifie(() => setUniteDuree(e.target.value as 'MOIS' | 'TRIMESTRES'))}><option value="MOIS">mois</option><option value="TRIMESTRES">trimestres</option></select></label>
              <label>Le loyer du fichier est<br /><select className={champ} value={uniteLoyer} onChange={e => modifie(() => setUniteLoyer(e.target.value as UniteLoyer))}><option value="PAR_PERIODE">le loyer de la période (déjà trimestriel si le contrat l’est)</option><option value="PAR_MOIS">un loyer par mois (converti ×3 si trimestriel)</option></select></label>
              <label>Périodicité si non indiquée<br /><select className={champ} value={periodiciteDefaut} onChange={e => modifie(() => setPeriodiciteDefaut(e.target.value as 'TRIMESTRIELLE' | 'MENSUELLE'))}><option value="TRIMESTRIELLE">trimestrielle</option><option value="MENSUELLE">mensuelle</option></select></label>
              <label>Commercial par défaut<br /><select className={champ} value={commercialDefautId} onChange={e => modifie(() => setCommercialDefautId(e.target.value))}><option value="">— aucun (erreur si inconnu) —</option>{commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></label>
            </div>
            {suggestionLoyer && suggestionLoyer !== uniteLoyer && (
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                ⚠ Le rapport loyer / montant financé de votre fichier ressemble à un loyer <b>{suggestionLoyer === 'PAR_MOIS' ? 'mensuel' : 'de la période (trimestriel)'}</b>, alors que vous avez choisi l’inverse. Vérifiez ce réglage : il change tous les loyers importés.
              </p>
            )}
            {suggestionLoyer && suggestionLoyer === uniteLoyer && <p className="text-xs text-gray-500">Contrôle : le rapport loyer / montant financé confirme ce réglage.</p>}
            {mapping.statut !== undefined && statuts.length > 0 && (
              <div className="text-sm">
                <p className="text-xs text-gray-600 mb-1">Statuts à importer (décochez ceux que vous ne voulez pas)</p>
                <div className="flex flex-wrap gap-3">
                  {statuts.map(x => (
                    <label key={x.valeur} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5">
                      <input type="checkbox" checked={statutsRetenus.includes(x.valeur)} onChange={e => modifie(() => setStatutsRetenus(l => (e.target.checked ? [...l, x.valeur] : l.filter(v => v !== x.valeur))))} />
                      {x.valeur || '(vide)'} <span className="text-gray-400">({x.nombre})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="text-xs w-full">
                <thead><tr className="text-left text-gray-500">{analyse.entetes.map((h, i) => <th key={i} className="p-1.5 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{analyse.lignes.slice(0, 4).map((l, i) => <tr key={i} className="border-t border-gray-50">{l.map((c, k) => <td key={k} className="p-1.5 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
            {manquants.length > 0 && <p className="text-sm text-amber-800">À associer : {manquants.map(c => LIBELLES_CHAMPS[c]).join(', ')}.</p>}
            <button disabled={occupe || manquants.length > 0} className="bg-gray-800 hover:bg-gray-900 text-white rounded-md transition px-4 py-1.5 text-sm disabled:opacity-50" onClick={() => lancer(true)}>Vérifier (rien n’est enregistré)</button>
          </section>

          {rapport && (
            <section className={section}>
              <h2 className="font-semibold text-gray-900">3. Résultat de la vérification</h2>
              <p className="text-sm"><b className="text-green-700">{rapport.importes} à importer</b> · {rapport.doublons} déjà présent(s) · {rapport.ignores} ignoré(s) · <b className={rapport.erreurs ? 'text-red-700' : ''}>{rapport.erreurs} en erreur</b>{rapport.tronque ? ' (liste tronquée aux 500 premières lignes)' : ''}</p>
              <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-96">
                <table className="text-xs w-full">
                  <thead className="sticky top-0 bg-white"><tr className="text-left text-gray-500"><th className="p-1.5">Ligne</th><th className="p-1.5">Client</th><th className="p-1.5">N° contrat</th><th className="p-1.5">Résultat</th><th className="p-1.5">Détail</th></tr></thead>
                  <tbody>
                    {rapport.lignes.map(l => (
                      <tr key={l.numero} className="border-t border-gray-50">
                        <td className="p-1.5">{l.numero}</td><td className="p-1.5">{l.client}</td><td className="p-1.5">{l.ref}</td>
                        <td className={`p-1.5 font-medium ${l.etat === 'OK' ? 'text-green-700' : l.etat === 'ERREUR' ? 'text-red-700' : 'text-gray-500'}`}>{l.etat === 'OK' ? (rapport.simule ? 'À importer' : 'Importé') : l.etat === 'DOUBLON' || l.etat === 'IGNORE' ? 'Ignoré' : 'Erreur'}</td>
                        <td className="p-1.5 text-gray-600">{l.message ?? `${l.commercialNom} · loyer ${euros(l.loyerCentimes)} · financé réel ${euros(l.montantReelCentimes)} · montant commercial recalculé ${l.montantCommercialCentimes == null ? 'impossible (durée absente du barème)' : euros(l.montantCommercialCentimes)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rapport.simule ? (
                <button disabled={occupe || rapport.importes === 0} className="bg-leasing-700 hover:bg-leasing-800 text-white transition rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50" onClick={() => lancer(false)}>Importer {rapport.importes} contrat{rapport.importes > 1 ? 's' : ''}</button>
              ) : (
                <p className="text-sm text-green-700">Import terminé. <Link href="/financement/contrats" className="underline">Voir les contrats</Link></p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
