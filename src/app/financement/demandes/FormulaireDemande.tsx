'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Entreprise } from '@/lib/financement/entreprises'
import { appel, eurosVersCentimes } from '../appel'
import { TitreSection } from '../Fiche'
import { dureeLibelle, euros, pourcentCoef } from '../format'
import { TYPES_BIENS_GRENKE } from '@/lib/financement/connecteurs/grenke/types-biens'
import { nouvelleLigne, type LigneForm } from './lignes'
import RechercheEntreprise from './RechercheEntreprise'

export interface ValeursFormulaire {
  financeurId: string; commercialId: string
  raisonSociale: string; siret: string; formeJuridique: string; adresse: string; codePostal: string; ville: string; pays: string
  contactPrenom: string; contactNom: string; contactEmail: string; contactTel: string
  dureeMois: string; periodicite: 'TRIMESTRIELLE' | 'MENSUELLE'; saisie: 'loyer' | 'montant'; valeur: string
  rachatId: string // renouvellement : identifiant du solde de contrat intégré (vide : aucun)
  observation: string
  lignes: LigneForm[]
}

interface Doublons {
  demandes: { id: number; reference: string; statut: string; financeur: string; creeLe: string; commercial: string }[]
  contrats: { id: number; reference: string | null; financeur: string; loyerCentimes: number; periodicite: string; dateFin: string | null; etat: 'EN_COURS' | 'TACITE'; commercial: string }[]
  autres: number
}
const LIBELLE_STATUT: Record<string, string> = { BROUILLON: 'Brouillon', ENVOYEE: 'Envoyée au financeur', INFOS_MANQUANTES: 'Informations manquantes', PRETE_A_SIGNER: 'Prête à signer', EN_SIGNATURE: 'En signature' }
const ligneRachat = (ref: string) => `Rachat du contrat n°${ref} dans le cadre de cette nouvelle demande.`

interface Calcul {
  dureesDisponibles: number[]
  resultat: {
    loyerCentimes: number
    commercial: { montantCentimes: number; coefficientPpm: number; horsTranche?: boolean }
    reel?: { montantCentimes: number; coefficientPpm: number; horsTranche?: boolean }
    margeCentimes?: number
  } | null
}

const champ = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition'
const Etiquette = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">{t}</span>{children}</label>

export default function FormulaireDemande(p: {
  mode: 'creation' | 'modification'
  rachat?: { id: number; totalCentimes: number; type: string; contrat: string } | null
  demandeId?: number
  initial: ValeursFormulaire
  financeurs: { id: number; nom: string; avecApi?: boolean }[]
  commerciaux: { id: number; nom: string }[] | null // null : le commercial saisit pour lui seul
  interne: boolean
}) {
  const router = useRouter()
  const [v, setV] = useState(p.initial)
  const [calcul, setCalcul] = useState<Calcul | null>(null)
  const [erreurCalcul, setErreurCalcul] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [doublons, setDoublons] = useState<Doublons | null>(null)
  const set = <K extends keyof ValeursFormulaire>(k: K, val: ValeursFormulaire[K]) => setV(x => ({ ...x, [k]: val }))

  const avecApi = p.financeurs.find(f => String(f.id) === v.financeurId)?.avecApi === true
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

  // Création : avant d'enregistrer (et, pour Grenke, d'envoyer), on signale les demandes et contrats déjà en cours pour ce client.
  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    if (p.mode === 'creation') {
      setEnvoi(true)
      try {
        const d = await appel<Doublons>('/api/financement/demandes/verifier', 'POST', { siret: v.siret, raisonSociale: v.raisonSociale })
        if (d.demandes.length > 0 || d.contrats.length > 0 || d.autres > 0) { setDoublons(d); setEnvoi(false); return }
      } catch { /* la vérification est une aide : si elle échoue, on n'empêche pas l'enregistrement */ }
    }
    await valider()
  }

  function basculerRachat(ref: string, coche: boolean) {
    setV(x => {
      const ligne = ligneRachat(ref)
      const sans = x.observation.split('\n').filter(l => l.trim() !== ligne).join('\n').trim()
      return { ...x, observation: coche ? [sans, ligne].filter(Boolean).join('\n') : sans }
    })
  }

  async function valider() {
    setErreur(null)
    setEnvoi(true)
    try {
    const corps = {
      financeurId: Number(v.financeurId), commercialId: v.commercialId ? Number(v.commercialId) : null,
      raisonSociale: v.raisonSociale, siret: v.siret, formeJuridique: v.formeJuridique, adresse: v.adresse, codePostal: v.codePostal, ville: v.ville, pays: v.pays,
      contactPrenom: v.contactPrenom, contactNom: v.contactNom, contactEmail: v.contactEmail, contactTel: v.contactTel,
      dureeMois: Number(v.dureeMois), periodicite: v.periodicite, rachatId: v.rachatId ? Number(v.rachatId) : null,
      loyerCentimes: valeurCentimes, observation: v.observation,
      lignes: v.lignes.map(l => ({ designation: l.designation ?? '', quantite: Number(l.quantite || 1), montantHtCentimes: (l.montantHt ?? '').trim() ? eurosVersCentimes(l.montantHt) : null, typeBien: avecApi ? l.typeBien || '7' : l.typeBien ?? '', constructeur: l.constructeur ?? '' })),
    }
      const r = await (p.mode === 'creation' ? appel<{ id: number; envoi?: string; message?: string; financeur?: string }>('/api/financement/demandes', 'POST', corps) : appel<{ id: number; envoi?: string; message?: string; financeur?: string }>(`/api/financement/demandes/${p.demandeId}`, 'PATCH', corps))
      const notice = r.envoi === 'ok' ? `?envoi=ok&f=${encodeURIComponent(r.financeur ?? '')}` : r.envoi === 'erreur' ? `?envoi=erreur&m=${encodeURIComponent((r.message ?? '').slice(0, 400))}` : ''
      router.push(`/financement/demandes/${r.id}${notice}`)
      router.refresh()
    } catch (err) {
      setErreur((err as Error).message)
      setEnvoi(false)
    }
  }

  const r = calcul?.resultat
  const section = 'carte p-5 sm:p-6 space-y-5'

  return (
    <form onSubmit={enregistrer} className="space-y-4">
      <section className={section}>
        <TitreSection icone="client">Client</TitreSection>
        <RechercheEntreprise onChoisir={choisirEntreprise} siren={v.siret} />
        <div className="grid gap-5 sm:grid-cols-2">
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
        <TitreSection icone="materiel">Matériel et prestations</TitreSection>
        <div className="space-y-2">
          {v.lignes.map((l, i) => (
            <div key={i} className={`grid gap-4 ${avecApi ? 'sm:grid-cols-[1fr_14rem_6rem_auto]' : 'sm:grid-cols-[1fr_6rem_auto]'} items-end border-b border-gray-100 pb-4`}>
              <Etiquette t="Désignation *"><input className={champ} value={l.designation} onChange={e => setV(x => ({ ...x, lignes: x.lignes.map((y, k) => (k === i ? { ...y, designation: e.target.value } : y)) }))} /></Etiquette>
              {avecApi ? (
                <Etiquette t="Type de bien">
                  <select className={champ} value={l.typeBien || '7'} onChange={e => setV(x => ({ ...x, lignes: x.lignes.map((y, k) => (k === i ? { ...y, typeBien: e.target.value } : y)) }))}>
                    {TYPES_BIENS_GRENKE.map(t => <option key={t.id} value={String(t.id)} disabled={!t.actif}>{t.libelle}{t.actif ? '' : ' — pas encore activé'}</option>)}
                  </select>
                </Etiquette>
              ) : null}
              <Etiquette t="Qté"><input className={champ} inputMode="numeric" value={l.quantite} onChange={e => setV(x => ({ ...x, lignes: x.lignes.map((y, k) => (k === i ? { ...y, quantite: e.target.value } : y)) }))} /></Etiquette>
              {v.lignes.length > 1 && <button type="button" className="text-gray-400 hover:text-red-600 pb-2" title="Supprimer la ligne" onClick={() => setV(x => ({ ...x, lignes: x.lignes.filter((_, k) => k !== i) }))}>×</button>}
            </div>
          ))}
        </div>
        <button type="button" className="text-sm underline text-gray-600" onClick={() => setV(x => ({ ...x, lignes: [...x.lignes, nouvelleLigne()] }))}>+ ajouter une ligne</button>
      </section>

      <section className={section}>
        <TitreSection icone="financement">Financement</TitreSection>
        <div className="grid gap-5 sm:grid-cols-3">
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
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm space-y-1">
            <p className="font-medium text-emerald-900">Rachat du contrat de {p.rachat.contrat} intégré ({p.rachat.type === 'RENOUVELANT' ? 'solde renouvelant' : 'solde non renouvelant'})</p>
            <p>Montant du rachat : <b>{euros(p.rachat.totalCentimes)}</b> — il est <b>compris</b> dans le montant à financer ci-dessous.</p>
            {r && <p>Reste pour le nouveau matériel : <b className={r.commercial.montantCentimes < p.rachat.totalCentimes ? 'text-red-700' : ''}>{euros(r.commercial.montantCentimes - p.rachat.totalCentimes)}</b>{r.commercial.montantCentimes < p.rachat.totalCentimes && ' — le rachat dépasse le montant financé : augmentez le loyer.'}</p>}
            <button type="button" className="text-xs underline text-gray-600" onClick={() => set('rachatId', '')}>Retirer le rachat de cette demande</button>
          </div>
        )}
        {erreurCalcul && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{erreurCalcul}</p>}
        {r && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <p>Loyer {v.periodicite === 'MENSUELLE' ? 'mensuel' : 'trimestriel'} : <b>{euros(r.loyerCentimes)}</b></p>
            <p>Montant (barème commercial) : <b>{euros(r.commercial.montantCentimes)}</b> <span className="text-gray-400">— coefficient {pourcentCoef(r.commercial.coefficientPpm)}</span></p>
            {r.reel && <p>Montant financé réel : <b>{euros(r.reel.montantCentimes)}</b> <span className="text-gray-400">— coefficient {pourcentCoef(r.reel.coefficientPpm)}</span></p>}
            {r.margeCentimes !== undefined && <p>Marge : <b className="text-emerald-700">{euros(r.margeCentimes)}</b></p>}
            {v.periodicite === 'MENSUELLE' && <p className="sm:col-span-2 text-orange-800">ℹ Paiement mensuel : les coefficients ci-dessus incluent la majoration prévue par le barème.</p>}
            {(r.commercial.horsTranche || r.reel?.horsTranche) && <p className="sm:col-span-2 text-amber-800">⚠ Ce montant sort des tranches du barème : le résultat est approximatif.</p>}
          </div>
        )}
      </section>

      <section className={section}>
        <Etiquette t="Observation (facultative)">
          <textarea className={champ} rows={2} maxLength={500} value={v.observation} onChange={e => set('observation', e.target.value)} placeholder="Ex. Rachat du contrat n°… dans le cadre de cette nouvelle demande" />
        </Etiquette>
        {avecApi && <p className="text-xs text-gray-500">Pour Grenke, l’observation est ajoutée au détail du premier matériel de la demande.</p>}
      </section>

      {doublons && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-4 text-sm text-amber-950">
          <h3 className="font-semibold">Attention : ce client a déjà des dossiers en cours</h3>
          {doublons.demandes.length > 0 && (
            <div>
              <p className="font-medium mb-1">Demandes en cours ({doublons.demandes.length})</p>
              <ul className="space-y-1">{doublons.demandes.map(d => <li key={d.id}><a className="underline" target="_blank" rel="noreferrer" href={`/financement/demandes/${d.id}`}>{d.reference}</a> · {d.financeur} · {LIBELLE_STATUT[d.statut] ?? d.statut} · {d.commercial} · {new Date(d.creeLe).toLocaleDateString('fr-FR')}</li>)}</ul>
            </div>
          )}
          {doublons.contrats.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium">Contrats en cours ({doublons.contrats.length})</p>
              {doublons.contrats.map(c => {
                const ref = c.reference ?? `#${c.id}`
                const coche = v.observation.split('\n').some(l => l.trim() === ligneRachat(ref))
                return (
                  <div key={c.id} className="bg-white/70 border border-amber-200 rounded-xl p-3">
                    <p><a className="underline" target="_blank" rel="noreferrer" href={`/financement/contrats/${c.id}`}>{c.reference ?? `Contrat #${c.id}`}</a> · {c.financeur} · {euros(c.loyerCentimes)} / {c.periodicite === 'MENSUELLE' ? 'mois' : 'trimestre'}{c.dateFin ? ` · fin ${new Date(c.dateFin).toLocaleDateString('fr-FR')}` : ''}{c.etat === 'TACITE' ? ' · tacite reconduction' : ''} · {c.commercial}</p>
                    <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={coche} onChange={e => basculerRachat(ref, e.target.checked)} /> Cette demande remplace ce contrat : le racheter dans le cadre de cette demande (ajoute une observation)</label>
                  </div>
                )
              })}
            </div>
          )}
          {doublons.autres > 0 && <p>{doublons.autres} autre(s) dossier(s) existent pour ce client chez un autre commercial. Rapprochez-vous de l’administration.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={envoi} onClick={() => { setDoublons(null); void valider() }} className="bg-accent-700 hover:bg-accent-800 text-white rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60">Continuer : enregistrer et envoyer</button>
            <button type="button" className="underline" onClick={() => setDoublons(null)}>Revenir à la saisie</button>
          </div>
        </section>
      )}

      {erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{erreur}</p>}
      <div className="flex gap-3">
        <button disabled={envoi} className="bg-accent-700 hover:bg-accent-800 text-white shadow-sm shadow-accent-800/20 transition rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-60">{p.mode === 'creation' ? 'Enregistrer et envoyer' : 'Enregistrer les modifications'}</button>
        <button type="button" className="text-sm underline text-gray-600" onClick={() => router.back()}>Annuler</button>
      </div>
    </form>
  )
}
