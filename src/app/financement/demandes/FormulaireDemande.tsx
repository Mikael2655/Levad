'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Entreprise } from '@/lib/financement/entreprises'
import { appel, eurosVersCentimes } from '../appel'
import { TitreSection } from '../Fiche'
import { dureeLibelle, euros, pourcentCoef } from '../format'
import { nouvelleLigne, type LigneForm } from './lignes'
import RechercheEntreprise from './RechercheEntreprise'

export interface ValeursFormulaire {
  financeurId: string; commercialId: string
  raisonSociale: string; siret: string; formeJuridique: string; adresse: string; codePostal: string; ville: string; pays: string
  contactPrenom: string; contactNom: string; contactEmail: string; contactTel: string
  dureeMois: string; periodicite: 'TRIMESTRIELLE' | 'MENSUELLE'; saisie: 'loyer' | 'montant'; valeur: string
  rachatId: string // renouvellement : identifiant du solde de contrat intégré (vide : aucun)
  lignes: LigneForm[]
}

interface Calcul {
  dureesDisponibles: number[]
  resultat: {
    loyerCentimes: number
    commercial: { montantCentimes: number; coefficientPpm: number; horsTranche?: boolean }
    reel?: { montantCentimes: number; coefficientPpm: number; horsTranche?: boolean }
    margeCentimes?: number
  } | null
}

const champ = 'w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-leasing-400 focus:border-leasing-400 transition'
const Etiquette = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block text-sm"><span className="text-gray-600 text-xs">{t}</span>{children}</label>

export default function FormulaireDemande(p: {
  mode: 'creation' | 'modification'
  rachat?: { id: number; totalCentimes: number; type: string; contrat: string } | null
  demandeId?: number
  initial: ValeursFormulaire
  financeurs: { id: number; nom: string }[]
  commerciaux: { id: number; nom: string }[] | null // null : le commercial saisit pour lui seul
  interne: boolean
}) {
  const router = useRouter()
  const [v, setV] = useState(p.initial)
  const [calcul, setCalcul] = useState<Calcul | null>(null)
  const [erreurCalcul, setErreurCalcul] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const set = <K extends keyof ValeursFormulaire>(k: K, val: ValeursFormulaire[K]) => setV(x => ({ ...x, [k]: val }))

  const valeurCentimes = v.valeur.trim() ? eurosVersCentimes(v.valeur) : null

  // Aperçu du loyer : calculé par le serveur (la réponse dépend du rôle).
  useEffect(() => {
    if (!v.financeurId) return
    let annule = false
    const t = setTimeout(async () => {
      try {
        const r = await appel<Calcul>('/api/financement/calcul', 'POST', {
          financeurId: Number(v.financeurId),
          commercialId: v.commercialId ? Number(v.commercialId) : null,
          dureeMois: v.dureeMois ? Number(v.dureeMois) : null,
          periodicite: v.periodicite,
          loyerCentimes: valeurCentimes,
        })
        if (!annule) { setCalcul(r); setErreurCalcul(null) }
      } catch (e) {
        if (!annule) { setCalcul(null); setErreurCalcul((e as Error).message) }
      }
    }, 350)
    return () => { annule = true; clearTimeout(t) }
  }, [v.financeurId, v.commercialId, v.dureeMois, v.periodicite, v.valeur]) // eslint-disable-line react-hooks/exhaustive-deps

  function choisirEntreprise(e: Entreprise) {
    setV(x => ({ ...x, raisonSociale: e.nom, siret: e.siret || e.siren, formeJuridique: e.formeJuridique || x.formeJuridique, adresse: e.adresse, codePostal: e.codePostal, ville: e.ville, pays: 'France' }))
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    try {
    const corps = {
      financeurId: Number(v.financeurId), commercialId: v.commercialId ? Number(v.commercialId) : null,
      raisonSociale: v.raisonSociale, siret: v.siret, formeJuridique: v.formeJuridique, adresse: v.adresse, codePostal: v.codePostal, ville: v.ville, pays: v.pays,
      contactPrenom: v.contactPrenom, contactNom: v.contactNom, contactEmail: v.contactEmail, contactTel: v.contactTel,
      dureeMois: Number(v.dureeMois), periodicite: v.periodicite, rachatId: v.rachatId ? Number(v.rachatId) : null,
      loyerCentimes: valeurCentimes,
      lignes: v.lignes.map(l => ({ designation: l.designation ?? '', quantite: Number(l.quantite || 1), montantHtCentimes: (l.montantHt ?? '').trim() ? eurosVersCentimes(l.montantHt) : null, typeBien: l.typeBien ?? '', constructeur: l.constructeur ?? '' })),
    }
      const r = await (p.mode === 'creation' ? appel<{ id: number }>('/api/financement/demandes', 'POST', corps) : appel<{ id: number }>(`/api/financement/demandes/${p.demandeId}`, 'PATCH', corps))
      router.push(`/financement/demandes/${r.id}`)
      router.refresh()
    } catch (err) {
      setErreur((err as Error).message)
      setEnvoi(false)
    }
  }

  const r = calcul?.resultat
  const section = 'bg-white rounded-lg border border-gray-200 p-4 sm:p-5 space-y-3'

  return (
    <form onSubmit={enregistrer} className="space-y-4">
      <section className={section}>
        <TitreSection>Client</TitreSection>
        <RechercheEntreprise onChoisir={choisirEntreprise} siren={v.siret} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Etiquette t="Raison sociale *"><input className={champ} value={v.raisonSociale} onChange={e => set('raisonSociale', e.target.value)} required /></Etiquette>
          <Etiquette t="SIREN / SIRET (obligatoire avant envoi au financeur)"><input className={champ} value={v.siret} onChange={e => set('siret', e.target.value)} inputMode="numeric" /></Etiquette>
          <Etiquette t="Forme juridique (SAS, SARL…)"><input className={champ} value={v.formeJuridique} onChange={e => set('formeJuridique', e.target.value)} /></Etiquette>
          <Etiquette t="Adresse *"><input className={champ} value={v.adresse} onChange={e => set('adresse', e.target.value)} required /></Etiquette>
          <Etiquette t="Code postal"><input className={champ} value={v.codePostal} onChange={e => set('codePostal', e.target.value)} /></Etiquette>
          <Etiquette t="Ville"><input className={champ} value={v.ville} onChange={e => set('ville', e.target.value)} /></Etiquette>
        </div>
        <p className="text-xs text-gray-500">Le nom, le prénom et l’e-mail du signataire seront demandés à l’étape suivante, au moment de l’envoi en signature.</p>
      </section>

      <section className={section}>
        <TitreSection>Matériel et prestations</TitreSection>
        <div className="space-y-2">
          {v.lignes.map((l, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_auto] items-end border-b border-gray-100 pb-2">
              <Etiquette t="Désignation *"><input className={champ} value={l.designation} onChange={e => setV(x => ({ ...x, lignes: x.lignes.map((y, k) => (k === i ? { ...y, designation: e.target.value } : y)) }))} /></Etiquette>
              <Etiquette t="Qté"><input className={champ} inputMode="numeric" value={l.quantite} onChange={e => setV(x => ({ ...x, lignes: x.lignes.map((y, k) => (k === i ? { ...y, quantite: e.target.value } : y)) }))} /></Etiquette>
              {v.lignes.length > 1 && <button type="button" className="text-gray-400 hover:text-red-600 pb-2" title="Supprimer la ligne" onClick={() => setV(x => ({ ...x, lignes: x.lignes.filter((_, k) => k !== i) }))}>×</button>}
            </div>
          ))}
        </div>
        <button type="button" className="text-sm underline text-gray-600" onClick={() => setV(x => ({ ...x, lignes: [...x.lignes, nouvelleLigne()] }))}>+ ajouter une ligne</button>
      </section>

      <section className={section}>
        <TitreSection>Financement</TitreSection>
        <div className="grid gap-3 sm:grid-cols-3">
          <Etiquette t="Financeur *">
            <select className={champ} value={v.financeurId} onChange={e => set('financeurId', e.target.value)} required>
              <option value="">Choisir…</option>
              {p.financeurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </Etiquette>
          {p.commerciaux && (
            <Etiquette t="Commercial rattaché *">
              <select className={champ} value={v.commercialId} onChange={e => set('commercialId', e.target.value)} required>
                <option value="">Choisir…</option>
                {p.commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </Etiquette>
          )}
          <Etiquette t="Périodicité">
            <select className={champ} value={v.periodicite} onChange={e => set('periodicite', e.target.value as ValeursFormulaire['periodicite'])}>
              <option value="TRIMESTRIELLE">Trimestrielle</option>
              <option value="MENSUELLE">Mensuelle (majoration)</option>
            </select>
          </Etiquette>
          <Etiquette t="Durée *">
            <select className={champ} value={v.dureeMois} onChange={e => set('dureeMois', e.target.value)} required>
              <option value="">Choisir…</option>
              {(calcul?.dureesDisponibles ?? (v.dureeMois ? [Number(v.dureeMois)] : [])).map(d => <option key={d} value={d}>{dureeLibelle(d)}</option>)}
            </select>
          </Etiquette>
          <Etiquette t={`Loyer ${v.periodicite === 'MENSUELLE' ? 'mensuel' : 'trimestriel'} HT (€) *`}>
            <input className={champ} inputMode="decimal" value={v.valeur} onChange={e => set('valeur', e.target.value)} placeholder="ex. 723,00" required />
          </Etiquette>
        </div>

        {p.rachat && v.rachatId && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm space-y-1">
            <p className="font-medium text-emerald-900">Rachat du contrat de {p.rachat.contrat} intégré ({p.rachat.type === 'RENOUVELANT' ? 'solde renouvelant' : 'solde non renouvelant'})</p>
            <p>Montant du rachat : <b>{euros(p.rachat.totalCentimes)}</b> — il est <b>compris</b> dans le montant à financer ci-dessous.</p>
            {r && <p>Reste pour le nouveau matériel : <b className={r.commercial.montantCentimes < p.rachat.totalCentimes ? 'text-red-700' : ''}>{euros(r.commercial.montantCentimes - p.rachat.totalCentimes)}</b>{r.commercial.montantCentimes < p.rachat.totalCentimes && ' — le rachat dépasse le montant financé : augmentez le loyer.'}</p>}
            <button type="button" className="text-xs underline text-gray-600" onClick={() => set('rachatId', '')}>Retirer le rachat de cette demande</button>
          </div>
        )}
        {erreurCalcul && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{erreurCalcul}</p>}
        {r && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <p>Loyer {v.periodicite === 'MENSUELLE' ? 'mensuel' : 'trimestriel'} : <b>{euros(r.loyerCentimes)}</b></p>
            <p>Montant (barème commercial) : <b>{euros(r.commercial.montantCentimes)}</b> <span className="text-gray-400">— coefficient {pourcentCoef(r.commercial.coefficientPpm)}</span></p>
            {r.reel && <p>Montant financé réel : <b>{euros(r.reel.montantCentimes)}</b> <span className="text-gray-400">— coefficient {pourcentCoef(r.reel.coefficientPpm)}</span></p>}
            {r.margeCentimes !== undefined && <p>Marge : <b className="text-emerald-700">{euros(r.margeCentimes)}</b></p>}
            {v.periodicite === 'MENSUELLE' && <p className="sm:col-span-2 text-orange-800">ℹ Paiement mensuel : les coefficients ci-dessus incluent la majoration prévue par le barème.</p>}
            {(r.commercial.horsTranche || r.reel?.horsTranche) && <p className="sm:col-span-2 text-amber-800">⚠ Ce montant sort des tranches du barème : le résultat est approximatif.</p>}
          </div>
        )}
      </section>

      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2">{erreur}</p>}
      <div className="flex gap-3">
        <button disabled={envoi} className="bg-leasing-700 hover:bg-leasing-800 text-white transition rounded-md px-6 py-2.5 text-sm font-semibold disabled:opacity-60">{p.mode === 'creation' ? 'Enregistrer en brouillon' : 'Enregistrer les modifications'}</button>
        <button type="button" className="text-sm underline text-gray-600" onClick={() => router.back()}>Annuler</button>
      </div>
    </form>
  )
}
