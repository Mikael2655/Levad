'use client'

import { useState, useTransition } from 'react'
import { apercuImportClients, importerClients, type ApercuClient, type ResultatClient } from '@/app/parc/(prive)/actions'
import { VERT } from '@/components/connect/affichage'

const ETAT = {
  nouveau: { texte: 'Nouveau', classe: 'bg-green-100 text-green-800' },
  'sans-mail': { texte: 'Sans mail', classe: 'bg-gray-100 text-gray-700' },
  existe: { texte: 'Existe déjà', classe: 'bg-gray-100 text-gray-700' },
  invalide: { texte: 'Adresse invalide', classe: 'bg-red-100 text-red-700' },
} as const

export function ImportClients() {
  const [texte, setTexte] = useState('')
  const [apercu, setApercu] = useState<ApercuClient[] | null>(null)
  const [resultats, setResultats] = useState<ResultatClient[] | null>(null)
  const [envoyer, setEnvoyer] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  const aCreer = (apercu ?? []).filter((l) => l.etat === 'nouveau' || l.etat === 'sans-mail')
  const nbMails = aCreer.filter((l) => l.mails.length > 0).length

  function previsualiser() {
    setErreur(null)
    setResultats(null)
    demarrer(async () => {
      try {
        setApercu(await apercuImportClients(texte))
      } catch {
        setErreur('Impossible de lire la liste, réessayez.')
      }
    })
  }

  function importer() {
    const question = envoyer && nbMails > 0
      ? `Créer ${aCreer.length} client${aCreer.length > 1 ? 's' : ''} et envoyer ${nbMails} mail${nbMails > 1 ? 's' : ''} avec leur lien d'installation ?`
      : `Créer ${aCreer.length} client${aCreer.length > 1 ? 's' : ''} sans envoyer de mail ?`
    if (!window.confirm(question)) return
    setErreur(null)
    demarrer(async () => {
      try {
        setResultats(await importerClients(texte, envoyer))
        setApercu(null)
        setTexte('')
      } catch (e) {
        setErreur(e instanceof Error && /maximum/.test(e.message) ? e.message : "L'import a échoué : vérifiez dans la liste des clients ce qui a été créé avant de recommencer.")
      }
    })
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border bg-white p-6">
        <label className="block text-sm font-medium text-gray-700">
          Liste des clients (une ligne par client : le nom, puis son ou ses mails séparés par des « ; »)
          <textarea
            value={texte}
            onChange={(e) => { setTexte(e.target.value); setApercu(null) }}
            rows={10}
            placeholder={'Atlantique Investissement\tamauret@atlantique-investissement.fr; mnajda@ai-re.fr\nAvep Courtage\tes@avepcourtage.fr'}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <button
          type="button"
          onClick={previsualiser}
          disabled={enCours || !texte.trim()}
          className="mt-3 rounded-lg border border-gray-300 px-5 py-2.5 font-semibold disabled:opacity-50"
        >
          {enCours && !apercu ? 'Lecture…' : 'Voir l’aperçu'}
        </button>
        {erreur && <p className="mt-3 text-sm font-semibold text-red-600">✕ {erreur}</p>}
      </section>

      {apercu && (
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Aperçu</h2>
          {apercu.length === 0 ? (
            <p className="mt-2 text-gray-600">Aucune ligne lisible.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4">Client</th>
                    <th className="py-2 pr-4">Mails</th>
                    <th className="py-2">État</th>
                  </tr>
                </thead>
                <tbody>
                  {apercu.map((l) => (
                    <tr key={l.nom} className="border-b last:border-0 align-top">
                      <td className="py-1.5 pr-4 font-semibold">{l.nom}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{l.mails.join('; ') || '—'}</td>
                      <td className="py-1.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ETAT[l.etat].classe}`}>{ETAT[l.etat].texte}</span>
                        {l.detail && l.etat !== 'nouveau' && <span className="ml-2 text-xs text-gray-500">{l.detail}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {aCreer.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={envoyer} onChange={(e) => setEnvoyer(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span>
                  <strong>Envoyer à chaque client son lien d&apos;installation par mail</strong> ({nbMails} mail{nbMails > 1 ? 's' : ''}). Chaque client reçoit son propre lien.
                </span>
              </label>
              <button
                type="button"
                onClick={importer}
                disabled={enCours}
                className="mt-4 rounded-lg px-5 py-2.5 font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: VERT }}
              >
                {enCours ? 'En cours…' : `Créer ${aCreer.length} client${aCreer.length > 1 ? 's' : ''}${envoyer && nbMails > 0 ? ' et envoyer les liens' : ''}`}
              </button>
            </div>
          )}
        </section>
      )}

      {resultats && (
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Résultat</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {resultats.map((r) => (
              <li key={r.nom} className={r.ok ? 'text-green-700' : 'text-red-600'}>
                {r.ok ? '✓' : '✕'} <strong>{r.nom}</strong> : {r.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
