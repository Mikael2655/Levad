'use client'

import { useState } from 'react'
import { apercuCsv, importerCsv, type ApercuCsv } from '@/app/parc/(prive)/actions'
import { dateDuNom, decoderCsv, lireCsv, type LigneCsv } from '@/lib/connect/import-csv'
import { VERT } from '@/components/connect/affichage'

// Import d'un export de compteurs HyperPrint (CSV) : lecture dans le navigateur, aperçu avec reconnaissance des machines, puis validation.
type Ligne = LigneCsv & { rec: ApercuCsv; inclure: boolean; client: string } // client : '' à choisir · 'creer' · identifiant

const champ = 'rounded-md border border-gray-300 bg-white px-2 py-1 text-sm'

export function ImportCsv({ clients }: { clients: { id: number; nom: string }[] }) {
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [fichier, setFichier] = useState('')
  const [jour, setJour] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }))
  const [erreur, setErreur] = useState('')
  const [fini, setFini] = useState('')
  const [occupe, setOccupe] = useState(false)

  async function lire(f: File | undefined) {
    if (!f) return
    setErreur('')
    setFini('')
    setLignes([])
    setOccupe(true)
    try {
      const { lignes: brutes, erreur } = lireCsv(decoderCsv(await f.arrayBuffer()))
      if (erreur) {
        setErreur(erreur)
        return
      }
      const reconnues = await apercuCsv(brutes.map((l) => ({ matricule: l.matricule, abonne: l.abonne })))
      setFichier(f.name)
      const d = dateDuNom(f.name)
      if (d) setJour(d)
      setLignes(
        brutes.map((l, i) => ({
          ...l,
          rec: reconnues[i],
          inclure: true,
          client: reconnues[i].clientId ? String(reconnues[i].clientId) : l.abonne ? 'creer' : '',
        })),
      )
    } catch {
      setErreur('Impossible de lire ce fichier.')
    } finally {
      setOccupe(false)
    }
  }

  const maj = (i: number, p: Partial<Ligne>) => setLignes((x) => x.map((l, k) => (k === i ? { ...l, ...p } : l)))
  const aImporter = lignes.filter((l) => l.inclure)
  const incomplet = aImporter.some((l) => l.rec.etat === 'nouvelle' && !l.client)

  async function valider() {
    if (incomplet) return
    if (!window.confirm(`Enregistrer ${aImporter.length} relevé${aImporter.length > 1 ? 's' : ''} au ${jour.split('-').reverse().join('/')} ?`)) return
    setOccupe(true)
    setErreur('')
    try {
      const msg = await importerCsv(
        jour,
        aImporter.map((l) => ({
          matricule: l.matricule,
          nb: l.nb,
          couleur: l.couleur,
          machineId: l.rec.machineId,
          clientId: l.rec.etat === 'nouvelle' && l.client && l.client !== 'creer' ? Number(l.client) : null,
          creerClient: l.rec.etat === 'nouvelle' && l.client === 'creer' ? l.abonne : null,
        })),
      )
      setFini(msg)
      setLignes([])
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'import a échoué.")
    } finally {
      setOccupe(false)
    }
  }

  const nombre = (n: number | null) => (n === null ? '—' : n.toLocaleString('fr-FR'))
  return (
    <section className="mt-8 rounded-xl border bg-white p-6">
      <h2 className="text-lg font-bold">Import d&apos;un export HyperPrint (CSV)</h2>
      <p className="text-sm text-gray-500">
        Pour les clients qui n&apos;ont pas encore Levad Connect. Colonnes attendues : Matricule, Abonné (facultatif), puis les volumes éq. A4 en couleur (« C ») et en noir et blanc (« N »), A3 compté double.
        Chaque machine est reconnue par son matricule.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium text-gray-700">
          Fichier CSV
          <input type="file" accept=".csv,.txt,text/csv" onChange={(e) => lire(e.target.files?.[0])} className="mt-1 block text-sm" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Date du relevé
          <input type="date" value={jour} onChange={(e) => setJour(e.target.value)} className={`${champ} mt-1 block`} />
        </label>
      </div>
      {erreur && <p className="mt-3 text-sm font-semibold text-red-600">✕ {erreur}</p>}
      {fini && <p className="mt-3 text-sm font-semibold text-green-700">✓ {fini}</p>}

      {lignes.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">{fichier} : {lignes.length} ligne{lignes.length > 1 ? 's' : ''}.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-2"></th>
                  <th className="py-2 pr-4">Matricule</th>
                  <th className="py-2 pr-4">Machine / client</th>
                  <th className="py-2 pr-4 text-right">N&amp;B</th>
                  <th className="py-2 pr-4 text-right">Couleur</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={l.matricule + i} className="border-b align-top last:border-0">
                    <td className="py-1.5 pr-2"><input type="checkbox" checked={l.inclure} onChange={(e) => maj(i, { inclure: e.target.checked })} aria-label={`Importer ${l.matricule}`} /></td>
                    <td className="py-1.5 pr-4 font-mono">{l.matricule}</td>
                    <td className="py-1.5 pr-4">
                      {l.rec.etat === 'connue' ? (
                        <span>{l.rec.machine} <span className="text-gray-500">· {l.rec.clientNom}</span></span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Nouvelle machine</span>
                          <select value={l.client} onChange={(e) => maj(i, { client: e.target.value })} className={champ}>
                            <option value="">Choisir le client…</option>
                            {l.abonne && !l.rec.clientId && <option value="creer">Créer le client « {l.abonne} »</option>}
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{nombre(l.nb)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{nombre(l.couleur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={valider}
            disabled={occupe || aImporter.length === 0 || incomplet}
            className="mt-4 rounded-lg px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: VERT }}
          >
            {occupe ? 'En cours…' : `Importer ${aImporter.length} relevé${aImporter.length > 1 ? 's' : ''}`}
          </button>
          {incomplet && <p className="mt-2 text-xs text-red-600">Choisissez le client des nouvelles machines (ou décochez-les).</p>}
        </div>
      )}
    </section>
  )
}
