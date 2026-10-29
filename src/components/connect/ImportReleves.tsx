'use client'

import { useEffect, useRef, useState } from 'react'
import { enregistrerImport } from '@/app/parc/(prive)/actions'
import { calculer, type Compteurs } from '@/lib/connect/calcul'

type MachineOpt = { id: number; libelle: string }
type ClientOpt = { id: number; nom: string; machines: MachineOpt[] }
type Ligne = { numero: string; nom: string; valeur: string }
type Carte = {
  cle: number
  fichier: string
  apercu: string | null
  doute: string | null
  reconnue: boolean
  clientId: string
  machineId: string // '' = à choisir, 'nouvelle' = nouvelle machine
  serie: string
  modele: string
  ip: string
  lignes: Ligne[]
}

const champ = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm'
let compteur = 0

// Redimensionne une photo (≤ 2000 px, JPEG) pour qu'elle passe sous la limite d'envoi ; l'orientation EXIF est appliquée.
async function reduire(f: File): Promise<File> {
  if (f.type === 'application/pdf') return f
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' })
  const ech = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * ech)
  c.height = Math.round(bmp.height * ech)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const blob: Blob = await new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('conversion'))), 'image/jpeg', 0.85))
  return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export function ImportReleves({ clients }: { clients: ClientOpt[] }) {
  const [cartes, setCartes] = useState<Carte[]>([])
  const [etat, setEtat] = useState('')
  const [erreurs, setErreurs] = useState<string[]>([])
  const [occupe, setOccupe] = useState(false)
  const [jour, setJour] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }))
  const [fini, setFini] = useState('')
  const entree = useRef<HTMLInputElement>(null)

  async function lire(fichiers: ArrayLike<File> | null) {
    if (!fichiers?.length) return
    setOccupe(true)
    setFini('')
    setErreurs([])
    const nouvelles: Carte[] = []
    const problemes: string[] = []
    let i = 0
    for (const f of Array.from(fichiers)) {
      i++
      setEtat(`Lecture du fichier ${i} sur ${fichiers.length} : ${f.name}…`)
      try {
        const petit = await reduire(f)
        const fd = new FormData()
        fd.append('fichier', petit)
        const rep = await fetch('/api/parc/import/lire', { method: 'POST', body: fd })
        const data = await rep.json().catch(() => ({ erreur: 'Réponse illisible du serveur.' }))
        if (!rep.ok) throw new Error(data.erreur ?? 'Erreur')
        const apercu = f.type === 'application/pdf' ? null : URL.createObjectURL(petit)
        const lectures: any[] = data.lectures ?? []
        if (!lectures.length) problemes.push(`${f.name} : aucun relevé reconnu dans ce fichier.`)
        lectures.forEach((l, k) => {
          nouvelles.push({
            cle: ++compteur,
            fichier: lectures.length > 1 ? `${f.name} (page ${k + 1})` : f.name,
            apercu,
            doute: l.doute,
            reconnue: Boolean(l.machine),
            clientId: l.machine ? String(l.machine.clientId) : '',
            machineId: l.machine ? String(l.machine.id) : '',
            serie: l.serie ?? '',
            modele: l.modele ?? '',
            ip: l.ip ?? '',
            lignes: (l.compteurs ?? []).map((c: any) => ({ numero: String(c.numero), nom: c.nom ?? '', valeur: String(c.valeur) })),
          })
        })
      } catch (e) {
        problemes.push(`${f.name} : ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    setCartes((x) => [...x, ...nouvelles])
    setErreurs(problemes)
    setEtat('')
    setOccupe(false)
    if (entree.current) entree.current.value = ''
  }

  // Glisser-déposer ou coller (Cmd/Ctrl + V) : fichiers, images copiées, et images glissées depuis le corps d'un mail
  const [survol, setSurvol] = useState(false)
  async function recevoir(dt: DataTransfer) {
    let fichiers: File[] = Array.from(dt.files ?? [])
    if (!fichiers.length) fichiers = Array.from(dt.items ?? []).filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter((f): f is File => Boolean(f))
    if (!fichiers.length) {
      // image glissée depuis une page web ou un mail : on récupère son adresse puis l'image
      let url = ''
      const html = dt.getData('text/html')
      if (html) url = new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src') ?? ''
      if (!url) url = (dt.getData('text/uri-list') || dt.getData('text/plain')).split(/\r?\n/).find((l) => /^(https?:|data:|blob:)/i.test(l.trim()))?.trim() ?? ''
      if (url) {
        try {
          const blob = await (await fetch(url)).blob()
          if (blob.type.startsWith('image/')) fichiers = [new File([blob], `image-collee-${Date.now()}.${blob.type.split('/')[1] || 'png'}`, { type: blob.type })]
        } catch {
          // image protégée ou illisible depuis cette page : message ci-dessous
        }
      }
    }
    if (!fichiers.length) {
      setErreurs(["Cette image ne peut pas être récupérée par glisser-déposer. Faites un clic droit sur l'image du mail, « Copier l'image », puis cliquez sur cette page et collez avec Cmd + V (Ctrl + V sous Windows)."])
      return
    }
    await lire(fichiers)
  }
  const recevoirRef = useRef(recevoir)
  recevoirRef.current = recevoir
  useEffect(() => {
    const coller = (e: ClipboardEvent) => {
      const cible = e.target as HTMLElement | null
      if (cible && ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName) && (cible as HTMLInputElement).type !== 'file') return
      if (e.clipboardData && Array.from(e.clipboardData.files).some((f) => f.type.startsWith('image/') || f.type === 'application/pdf')) {
        e.preventDefault()
        recevoirRef.current(e.clipboardData)
      }
    }
    document.addEventListener('paste', coller)
    return () => document.removeEventListener('paste', coller)
  }, [])

  const maj = (cle: number, p: Partial<Carte>) => setCartes((x) => x.map((c) => (c.cle === cle ? { ...c, ...p } : c)))
  const majLigne = (cle: number, i: number, p: Partial<Ligne>) =>
    setCartes((x) => x.map((c) => (c.cle === cle ? { ...c, lignes: c.lignes.map((l, k) => (k === i ? { ...l, ...p } : l)) } : c)))

  function compteursDe(c: Carte): Compteurs {
    const o: Compteurs = {}
    for (const l of c.lignes) {
      const n = l.numero.trim()
      const v = Number(l.valeur.replace(/\s/g, ''))
      if (/^\d{1,4}$/.test(n) && l.valeur.trim() !== '' && Number.isFinite(v)) o[n] = { v, nom: l.nom || undefined }
    }
    return o
  }

  const pret = (c: Carte) => Boolean(c.clientId) && Boolean(c.machineId) && (c.machineId !== 'nouvelle' || Boolean(c.serie.trim() || c.ip.trim())) && Object.keys(compteursDe(c)).length > 0
  const toutPret = cartes.length > 0 && cartes.every(pret)

  async function valider() {
    setOccupe(true)
    setErreurs([])
    try {
      const msg = await enregistrerImport(
        JSON.stringify({
          jour,
          elements: cartes.map((c) => ({
            clientId: Number(c.clientId),
            machineId: c.machineId === 'nouvelle' ? null : Number(c.machineId),
            serie: c.serie,
            modele: c.modele,
            ip: c.ip,
            compteurs: compteursDe(c),
          })),
        }),
      )
      setFini(msg)
      setCartes([])
    } catch (e) {
      setErreurs([e instanceof Error ? e.message : 'Enregistrement impossible'])
    }
    setOccupe(false)
  }

  return (
    <div className="space-y-6">
      <section
        className={`rounded-xl border bg-white p-6 ${survol ? 'border-2 border-dashed bg-gray-50' : ''}`}
        style={survol ? { borderColor: '#8c9e8b' } : undefined}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true) }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); if (!occupe) recevoir(e.dataTransfer) }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Fichiers reçus (PDF ou photos de l&apos;écran)
            <input ref={entree} type="file" multiple accept="application/pdf,image/*" disabled={occupe} onChange={(e) => lire(e.target.files)} className="mt-1 block w-full text-sm" />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              Vous pouvez aussi <strong>glisser-déposer</strong> un fichier ou une image sur ce cadre, ou la <strong>coller</strong> (clic droit sur l&apos;image du mail, « Copier l&apos;image », puis Cmd + V).
            </span>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Date du relevé (par défaut aujourd&apos;hui)
            <input type="date" value={jour} onChange={(e) => setJour(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-gray-500">À changer si le relevé a été reçu un autre jour que celui où vous le déposez.</span>
          </label>
        </div>
        {etat && <p className="mt-3 text-sm text-gray-600">{etat}</p>}
        {fini && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">{fini}</p>}
        {erreurs.map((e, i) => (
          <p key={i} className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{e}</p>
        ))}
      </section>

      {cartes.map((c) => {
        const client = clients.find((x) => String(x.id) === c.clientId)
        const compteurs = compteursDe(c)
        const total = calculer(compteurs).retenue
        return (
          <section key={c.cle} className="rounded-xl border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{c.fichier}</h2>
                <p className="text-sm text-gray-500">
                  {c.reconnue ? 'Machine reconnue grâce au numéro de série.' : c.serie ? 'Machine inconnue : choisissez le client une seule fois, les prochains relevés seront reconnus seuls.' : 'Aucun numéro de série lisible : choisissez le client et la machine.'}
                </p>
              </div>
              <button type="button" onClick={() => setCartes((x) => x.filter((k) => k.cle !== c.cle))} className="text-sm text-gray-500 underline">Retirer</button>
            </div>
            {c.doute && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">À vérifier : {c.doute}</p>}

            <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
              {c.apercu && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.apercu} alt={c.fichier} className="h-auto max-w-full rounded-lg border" />
              )}
              <div className={c.apercu ? '' : 'lg:col-span-2'}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Client
                    <select value={c.clientId} onChange={(e) => maj(c.cle, { clientId: e.target.value, machineId: '' })} className={champ + ' mt-1'}>
                      <option value="">Choisir le client…</option>
                      {clients.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Machine
                    <select value={c.machineId} onChange={(e) => maj(c.cle, { machineId: e.target.value })} disabled={!client} className={champ + ' mt-1'}>
                      <option value="">Choisir la machine…</option>
                      {client?.machines.map((m) => <option key={m.id} value={m.id}>{m.libelle}</option>)}
                      <option value="nouvelle">+ Nouvelle machine</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    N° de série
                    <input value={c.serie} onChange={(e) => maj(c.cle, { serie: e.target.value })} className={champ + ' mt-1'} />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Modèle
                    <input value={c.modele} onChange={(e) => maj(c.cle, { modele: e.target.value })} className={champ + ' mt-1'} />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Adresse IP
                    <input value={c.ip} onChange={(e) => maj(c.cle, { ip: e.target.value })} className={champ + ' mt-1'} />
                  </label>
                </div>
                {c.machineId === 'nouvelle' && !c.serie.trim() && !c.ip.trim() && (
                  <p className="mt-2 text-sm text-red-600">Une nouvelle machine a besoin d&apos;un numéro de série ou d&apos;une adresse IP.</p>
                )}

                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="w-20 py-1.5 pr-2">N°</th>
                      <th className="py-1.5 pr-2">Nom</th>
                      <th className="w-36 py-1.5 pr-2 text-right">Valeur</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {c.lignes.map((l, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-2"><input value={l.numero} onChange={(e) => majLigne(c.cle, i, { numero: e.target.value })} className={champ} /></td>
                        <td className="py-1 pr-2"><input value={l.nom} onChange={(e) => majLigne(c.cle, i, { nom: e.target.value })} className={champ} /></td>
                        <td className="py-1 pr-2"><input inputMode="numeric" value={l.valeur} onChange={(e) => majLigne(c.cle, i, { valeur: e.target.value })} className={champ + ' text-right'} /></td>
                        <td className="py-1 text-center">
                          <button type="button" aria-label="Supprimer la ligne" onClick={() => maj(c.cle, { lignes: c.lignes.filter((_, k) => k !== i) })} className="text-gray-400 hover:text-red-600">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => maj(c.cle, { lignes: [...c.lignes, { numero: '', nom: '', valeur: '' }] })} className="mt-2 text-sm text-gray-600 underline">+ Ajouter un compteur</button>
                <p className="mt-3 text-sm text-gray-700">
                  {total ? (
                    <>Totaux calculés : N&amp;B <strong>{total.nb.toLocaleString('fr-FR')}</strong> · couleur <strong>{total.couleur.toLocaleString('fr-FR')}</strong> <span className="text-gray-400">(règle {total.code})</span></>
                  ) : (
                    <span className="text-amber-700">Compteurs insuffisants pour calculer les totaux N&amp;B / couleur (le relevé sera quand même enregistré).</span>
                  )}
                </p>
              </div>
            </div>
          </section>
        )
      })}

      {cartes.length > 0 && (
        <div className="flex items-center gap-4">
          <button type="button" onClick={valider} disabled={!toutPret || occupe} className="rounded-lg bg-[#8c9e8b] px-5 py-2.5 font-semibold text-white disabled:opacity-50">
            Valider et enregistrer ({cartes.length})
          </button>
          {!toutPret && <span className="text-sm text-gray-500">Choisissez le client et la machine pour chaque relevé.</span>}
        </div>
      )}
    </div>
  )
}
