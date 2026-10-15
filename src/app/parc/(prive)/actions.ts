'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { connecte } from '@/lib/connect/auth'
import { COULEURS, stockCourant } from '@/lib/connect/alertes'
import { GAMME_AUTRES, cleGroupe, familleDe, gammeParCode } from '@/lib/connect/gammes'
import { assurerCode, assurerCodeEspace, listeIps, regenererCode, regenererCodeEspace, urlsTelechargement } from '@/lib/connect/agent'
import { adressesMail } from '@/lib/connect/mail'
import { envoyerLienClient } from '@/lib/connect/lien-mail'
import { cleClient } from '@/lib/connect/normaliser'
import { MAX_CLIENTS_PAR_IMPORT, lireListe } from '@/lib/connect/import-clients'
import { dateValide, finDeJournee } from '@/lib/connect/export'
import { rechercherReference } from '@/lib/connect/modeles'

const seuil = (v: FormDataEntryValue | null) => Math.min(100, Math.max(0, Number(v ?? 25) || 0))

// Actions du tableau de bord (réglages d'une machine, renommage d'un client). Toutes exigent d'être connecté.

export async function enregistrerReglages(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const clientId = Number(formData.get('clientId'))
  const nomAffiche = String(formData.get('nomAffiche') ?? '').trim().slice(0, 120) || null
  const site = String(formData.get('site') ?? '').trim().slice(0, 120) || 'Site principal'

  const gammeChoisie = String(formData.get('gamme') ?? '')
  const avant = await prisma.connectMachine.findUnique({ where: { id } })
  if (!avant) return
  await prisma.connectMachine.update({
    where: { id },
    data: {
      gamme: gammeParCode(gammeChoisie) ? gammeChoisie : null,
      horsContrat: formData.get('horsContrat') === 'on',
      nomAffiche,
      site,
      seuilNoir: seuil(formData.get('seuilNoir')),
      seuilCyan: seuil(formData.get('seuilCyan')),
      seuilMagenta: seuil(formData.get('seuilMagenta')),
      seuilJaune: seuil(formData.get('seuilJaune')),
      aVerifier: false, // la machine a été relue et réglée à la main
      ...(clientId ? { clientId } : {}),
    },
  })
  // Si la machine change de site ou de gamme, son stock la suit (sauf si d'autres machines utilisent encore l'ancien groupe).
  const apres = await prisma.connectMachine.findUnique({ where: { id } })
  if (apres) {
    const ancienne = cleGroupe(avant)
    const nouvelle = cleGroupe(apres)
    if (ancienne !== nouvelle || avant.clientId !== apres.clientId) {
      const restantes = await prisma.connectMachine.findMany({ where: { clientId: avant.clientId, id: { not: id } } })
      if (!restantes.some((m) => cleGroupe(m) === ancienne)) {
        await prisma.connectStockMouvement.updateMany({
          where: { clientId: avant.clientId, groupe: ancienne },
          data: { groupe: nouvelle, clientId: apres.clientId },
        })
      }
    }
  }
  revalidatePath('/parc', 'layout')
}

export async function renommerClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const nom = String(formData.get('nom') ?? '').trim().slice(0, 120)
  if (!nom) return
  await prisma.connectClient.update({ where: { id }, data: { nom } })
  revalidatePath('/parc')
  revalidatePath(`/parc/client/${id}`)
}

// Met toutes les machines d'un client hors contrat (ou les remet sous contrat) d'un seul clic.
export async function definirHorsContratClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const horsContrat = String(formData.get('valeur')) === 'oui'
  await prisma.connectMachine.updateMany({ where: { clientId: id }, data: { horsContrat } })
  revalidatePath('/parc', 'layout')
}

// Cherche la référence (modèle) d'une machine d'après sa marque et son numéro de série, avec l'IA et une recherche web.
export async function chercherReference(formData: FormData): Promise<string> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const m = await prisma.connectMachine.findUnique({ where: { id } })
  if (!m) return '!Machine introuvable'
  try {
    const trouve = await rechercherReference({ marque: m.marque, serie: m.numeroSerie, nom: m.modele, sysDescr: m.sysDescr })
    if (!trouve) return '!Référence introuvable : indiquez-la à la main dans « Nom affiché »'
    await prisma.connectMachine.update({
      where: { id },
      data: {
        modele: trouve,
        // le nom lu jusqu'ici (souvent celui donné par le client) est gardé à côté de la référence
        nomReseau: m.nomReseau ?? (m.modele && m.modele.toLowerCase() !== trouve.toLowerCase() ? m.modele : null),
        modeleFixe: true,
        aVerifier: false,
      },
    })
    revalidatePath('/parc', 'layout')
    return `Référence trouvée : ${trouve}`
  } catch (e) {
    return '!La recherche a échoué : ' + (e instanceof Error ? e.message : 'erreur')
  }
}

// Supprime un client avec ses machines, relevés, stock, ordinateurs et historique du lien (irréversible).
export async function supprimerClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  if (!id) return
  await prisma.connectClient.delete({ where: { id } })
  revalidatePath('/parc', 'layout')
  redirect('/parc')
}

// Seuils d'alerte appliqués d'un coup à toutes les machines d'un client.
export async function appliquerSeuilsClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await prisma.connectMachine.updateMany({
    where: { clientId: id },
    data: {
      seuilNoir: seuil(formData.get('seuilNoir')),
      seuilCyan: seuil(formData.get('seuilCyan')),
      seuilMagenta: seuil(formData.get('seuilMagenta')),
      seuilJaune: seuil(formData.get('seuilJaune')),
    },
  })
  revalidatePath('/parc', 'layout')
}

// Choix de la gamme d'encre d'une machine non reconnue (ou correction de la gamme reconnue) ; son stock la suit.
export async function choisirGamme(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const code = String(formData.get('gamme') ?? '')
  const avant = await prisma.connectMachine.findUnique({ where: { id } })
  if (!avant) return '!Machine introuvable'
  if (code && code !== GAMME_AUTRES && !gammeParCode(code)) return '!Gamme inconnue'
  await prisma.connectMachine.update({ where: { id }, data: { gamme: code || null } })
  const apres = { ...avant, gamme: code || null }
  const ancienne = cleGroupe(avant)
  const nouvelle = cleGroupe(apres)
  if (ancienne !== nouvelle) {
    const restantes = await prisma.connectMachine.findMany({ where: { clientId: avant.clientId, id: { not: id } } })
    if (!restantes.some((m) => cleGroupe(m) === ancienne)) {
      await prisma.connectStockMouvement.updateMany({ where: { clientId: avant.clientId, groupe: ancienne }, data: { groupe: nouvelle } })
    }
  }
  revalidatePath('/parc', 'layout')
  return code ? `Gamme enregistrée : ${code === GAMME_AUTRES ? 'Autres' : code}` : 'Gamme remise en automatique'
}

// Stock minimum voulu par le client pour un groupe (site + gamme) : en dessous, l'alerte se déclenche comme s'il n'y avait plus de stock.
export async function definirStockMinimum(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('clientId'))
  const groupe = String(formData.get('groupe') ?? '')
  if (!clientId || !groupe) return '!Données manquantes'
  for (const couleur of ['noir', 'cyan', 'magenta', 'jaune']) {
    const brut = formData.get(`min_${couleur}`)
    if (brut === null) continue
    const minimum = Math.min(99, Math.max(0, Math.floor(Number(brut) || 0)))
    const cle = { clientId_groupe_couleur: { clientId, groupe, couleur } }
    if (minimum === 0) await prisma.connectStockMinimum.deleteMany({ where: { clientId, groupe, couleur } })
    else await prisma.connectStockMinimum.upsert({ where: cle, update: { minimum }, create: { clientId, groupe, couleur, minimum } })
  }
  revalidatePath('/parc', 'layout')
  return 'Stock minimum enregistré'
}

// Suppression d'une ligne de l'historique du stock (le stock est recalculé aussitôt).
export async function supprimerMouvement(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await prisma.connectStockMouvement.deleteMany({ where: { id } })
  revalidatePath('/parc', 'layout')
  return 'Ligne supprimée'
}

// Les groupes de stock d'un client = un par (site + gamme compatible) ; une machine à la gamme inconnue a le sien.
async function groupesValides(clientId: number): Promise<Set<string>> {
  const machines = await prisma.connectMachine.findMany({ where: { clientId } })
  return new Set(machines.map((m) => cleGroupe(m)))
}

// Saisie d'un envoi de cartouches : plusieurs groupes et plusieurs couleurs d'un coup (une quantité par case, 0 = rien).
export async function ajouterEnvoi(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('clientId'))
  const note = String(formData.get('note') ?? '').trim().slice(0, 200) || null
  const dateSaisie = String(formData.get('date') ?? '')
  if (!clientId) return '!Client inconnu'
  const date = dateSaisie && !Number.isNaN(Date.parse(dateSaisie)) ? new Date(dateSaisie) : new Date()
  const valides = await groupesValides(clientId)
  const data: { clientId: number; groupe: string; variante: string; couleur: string; delta: number; motif: string; note: string | null; date: Date }[] = []
  for (let i = 0; i < 100; i++) {
    const groupe = formData.get(`groupe_${i}`)
    if (groupe === null) break
    if (!valides.has(String(groupe))) continue
    const g = gammeParCode(String(groupe).slice(String(groupe).lastIndexOf('|') + 1))
    const variantes = g ? familleDe(g).variantes : [null]
    for (const couleur of COULEURS) {
      variantes.forEach((v, vi) => {
        const q = Math.floor(Number(formData.get(`qte_${i}_${couleur}_${vi}`)) || 0)
        // la version standard est enregistrée « vide », les versions L / H par leur code
        if (q >= 1) data.push({ clientId, groupe: String(groupe), variante: vi === 0 ? '' : v!.code, couleur, delta: Math.min(q, 999), motif: 'envoi', note, date })
      })
    }
  }
  if (!data.length) return '!Aucune quantité saisie'
  await prisma.connectStockMouvement.createMany({ data })
  revalidatePath('/parc', 'layout')
  return `Envoi enregistré (${data.reduce((n, l) => n + l.delta, 0)} cartouche${data.reduce((n, l) => n + l.delta, 0) > 1 ? 's' : ''})`
}

// Correction manuelle du stock d'un groupe : on indique la quantité réelle, le programme enregistre la différence.
export async function corrigerStock(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('clientId'))
  const groupe = String(formData.get('groupe') ?? '')
  const couleur = String(formData.get('couleur') ?? '')
  const variante = String(formData.get('variante') ?? '')
  const voulu = Math.max(0, Math.floor(Number(formData.get('quantite'))))
  if (!clientId || !(COULEURS as readonly string[]).includes(couleur) || Number.isNaN(voulu) || !(await groupesValides(clientId)).has(groupe)) return '!Valeur invalide'
  const actuel = Math.max(0, await stockCourant(clientId, groupe, couleur, variante))
  if (voulu === actuel) return 'Déjà à cette quantité : rien à changer'
  await prisma.connectStockMouvement.create({
    data: { clientId, groupe, variante, couleur, delta: voulu - actuel, motif: 'correction', note: `Corrigé de ${actuel} à ${voulu}` },
  })
  revalidatePath('/parc', 'layout')
  return `Stock corrigé : ${voulu}`
}

// ---- Programme résident : lien personnel du client ------------------------------------------

// Adresses IP de copieurs que la recherche automatique ne trouve pas : le programme les lit en plus, à chaque relevé.
export async function enregistrerIps(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const brut = String(formData.get('ips') ?? '')
  const ips = listeIps(brut)
  const ignorees = brut.split(/[\s,;]+/).filter(Boolean).length - ips.length
  await prisma.connectClient.update({ where: { id }, data: { ipsManuelles: ips.length ? ips.join('\n') : null } })
  revalidatePath(`/parc/client/${id}`)
  return ips.length
    ? `${ips.length} adresse(s) enregistrée(s)${ignorees > 0 ? ` (${ignorees} ignorée(s) : adresse invalide ou doublon)` : ''}`
    : 'Liste vidée'
}

export async function genererEspace(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await assurerCodeEspace(id)
  revalidatePath(`/parc/client/${id}`)
}

// Invalide l'ancien lien de l'espace client et en crée un nouveau.
export async function regenererEspace(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await regenererCodeEspace(id)
  revalidatePath(`/parc/client/${id}`)
}

export async function genererLien(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await assurerCode(id)
  revalidatePath(`/parc/client/${id}`)
}

// Invalide l'ancien lien (et donc les programmes déjà téléchargés avec l'ancien code cessent de pouvoir s'identifier).
export async function regenererLien(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await regenererCode(id)
  await prisma.connectLienEvenement.create({ data: { clientId: id, type: 'regenere', detail: 'ancien lien désactivé' } })
  revalidatePath(`/parc/client/${id}`)
}

export async function majClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const email = String(formData.get('email') ?? '').trim().slice(0, 200) || null
  const modeReleve = String(formData.get('modeReleve') ?? 'agent') === 'manuel' ? 'manuel' : 'agent'
  const jours = Math.min(90, Math.max(1, Math.floor(Number(formData.get('seuilDeconnexionJours')) || 10)))
  const mois = Number(formData.get('moisFacturation'))
  const moisFacturation = [1, 2, 3].includes(mois) ? mois : null
  await prisma.connectClient.update({ where: { id }, data: { email, modeReleve, seuilDeconnexionJours: jours, moisFacturation } })
  revalidatePath(`/parc/client/${id}`)
  revalidatePath('/parc/connexions')
}

// Envoie le lien d'installation au client par mail, en un clic.
export async function envoyerLien(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const { valides, invalides } = adressesMail(String(formData.get('email') ?? ''))
  if (valides.length === 0) return '!Adresse mail invalide'
  if (invalides.length > 0) return `!Adresse invalide : ${invalides.join(', ')}`
  if (valides.length > 10) return '!10 adresses au maximum'
  const email = valides.join('; ')
  const client = await prisma.connectClient.findUnique({ where: { id } })
  if (!client) return '!Client introuvable'
  await envoyerLienClient(id, valides)
  revalidatePath('/parc', 'layout')
  return `Lien envoyé à ${email}`
}

// ---- Lecture à la demande (bouton « Actualiser ») -----------------------------------------------

export async function demanderLecture(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const machineId = Number(formData.get('machineId'))
  const machine = await prisma.connectMachine.findUnique({ where: { id: machineId } })
  if (!machine) return
  const deja = await prisma.connectCommande.findFirst({ where: { clientId: machine.clientId, faiteLe: null } })
  if (!deja) await prisma.connectCommande.create({ data: { clientId: machine.clientId, machineId } })
  revalidatePath(`/parc/machine/${machineId}`)
}

// Lecture immédiate demandée depuis la fiche du client (utile quand il n'a encore aucune machine) : le programme la fait à son prochain signal (moins d'une minute).
export async function demanderLectureClient(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('id'))
  const deja = await prisma.connectCommande.findFirst({ where: { clientId, faiteLe: null } })
  if (!deja) await prisma.connectCommande.create({ data: { clientId } })
  revalidatePath(`/parc/client/${clientId}`)
  return 'Lecture demandée : le programme la fait dans la minute (si le PC est allumé)'
}

// ---- Machine hors contrat : plus d'alerte d'encre, et exclue des exports -------------------------

// Depuis la synthèse : crée le lien du client s'il n'existe pas, puis ouvre sa fiche sur le lien à envoyer.
export async function preparerLien(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await assurerCode(id)
  revalidatePath(`/parc/client/${id}`)
  redirect(`/parc/client/${id}#lien`)
}

// Ajout d'un client qui n'a encore rien envoyé : on crée sa fiche et son lien, puis on ouvre la fiche pour envoyer le lien.
export async function creerClient(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const nom = String(formData.get('nom') ?? '').trim().slice(0, 120)
  const email = String(formData.get('email') ?? '').trim().slice(0, 200)
  if (!nom) return '!Indiquez le nom du client'
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return '!Adresse mail invalide'
  const cle = cleClient(nom)
  const client = await prisma.connectClient.upsert({
    where: { cle },
    update: email ? { email } : {},
    create: { cle, nom, email: email || null },
  })
  await assurerCode(client.id)
  revalidatePath('/parc', 'layout')
  redirect(`/parc/client/${client.id}#lien`)
}

// ---- Import d'une liste de clients ---------------------------------------------------------------

export type ApercuClient = { nom: string; mails: string[]; etat: 'nouveau' | 'existe' | 'invalide' | 'sans-mail'; detail?: string }

async function classer(texte: string): Promise<ApercuClient[]> {
  const lignes = lireListe(texte)
  const existants = new Set((await prisma.connectClient.findMany({ where: { cle: { in: lignes.map((l) => l.cle) } }, select: { cle: true } })).map((c) => c.cle))
  return lignes.map((l): ApercuClient => {
    if (existants.has(l.cle)) return { nom: l.nom, mails: l.mails, etat: 'existe', detail: 'existe déjà : ignoré' }
    if (l.invalides.length) return { nom: l.nom, mails: l.mails, etat: 'invalide', detail: `adresse invalide : ${l.invalides.join(', ')}` }
    if (l.mails.length === 0) return { nom: l.nom, mails: [], etat: 'sans-mail', detail: 'sans adresse mail : créé sans envoi' }
    return { nom: l.nom, mails: l.mails, etat: 'nouveau' }
  })
}

export async function apercuImportClients(texte: string): Promise<ApercuClient[]> {
  if (!connecte()) throw new Error('Non connecté')
  return classer(texte)
}

export type ResultatClient = { nom: string; ok: boolean; message: string }

// Crée les nouveaux clients (leur lien personnel est créé en même temps) et, si demandé, leur envoie leur lien par mail.
export async function importerClients(texte: string, envoyer: boolean): Promise<ResultatClient[]> {
  if (!connecte()) throw new Error('Non connecté')
  const apercu = await classer(texte)
  const aFaire = apercu.filter((l) => l.etat === 'nouveau' || l.etat === 'sans-mail')
  if (aFaire.length > MAX_CLIENTS_PAR_IMPORT) throw new Error(`${MAX_CLIENTS_PAR_IMPORT} clients au maximum à la fois`)
  const resultats: ResultatClient[] = apercu.filter((l) => !aFaire.includes(l)).map((l) => ({ nom: l.nom, ok: false, message: `Ignoré : ${l.detail}` }))
  for (const l of aFaire) {
    try {
      const client = await prisma.connectClient.create({ data: { cle: cleClient(l.nom), nom: l.nom, email: l.mails.length ? l.mails.join('; ') : null } })
      await assurerCode(client.id)
      if (envoyer && l.mails.length) {
        try {
          await envoyerLienClient(client.id, l.mails)
          resultats.push({ nom: l.nom, ok: true, message: `Créé, lien envoyé à ${l.mails.join('; ')}` })
        } catch (e) {
          resultats.push({ nom: l.nom, ok: false, message: `Créé, mais l'envoi a échoué (${e instanceof Error ? e.message : 'erreur'}) : à renvoyer depuis sa fiche` })
        }
        await new Promise((r) => setTimeout(r, 600)) // le service de mail limite le rythme des envois
      } else {
        resultats.push({ nom: l.nom, ok: true, message: 'Créé, lien non envoyé' })
      }
    } catch {
      resultats.push({ nom: l.nom, ok: false, message: 'Création impossible' })
    }
  }
  revalidatePath('/parc', 'layout')
  return resultats
}

// ---- Ordinateurs (un par site chez le client) ---------------------------------------------------

// Définit le site d'un ordinateur : toutes les machines qu'il a lues passent à ce site (leur stock les suit),
// et les machines qu'il découvrira plus tard le prendront aussi.
export async function definirSitePoste(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const site = String(formData.get('site') ?? '').trim().slice(0, 120) || 'Site principal'
  const poste = await prisma.connectPoste.findUnique({ where: { id } })
  if (!poste) return '!Ordinateur introuvable'
  await prisma.connectPoste.update({ where: { id }, data: { site } })
  const lues = await prisma.connectReleve.findMany({
    where: { pc: poste.nom, machine: { clientId: poste.clientId } },
    distinct: ['machineId'],
    select: { machineId: true },
  })
  for (const { machineId } of lues) {
    const avant = await prisma.connectMachine.findUnique({ where: { id: machineId } })
    if (!avant || avant.site === site) continue
    const apres = await prisma.connectMachine.update({ where: { id: machineId }, data: { site } })
    const ancienne = cleGroupe(avant)
    if (ancienne !== cleGroupe(apres)) {
      const restantes = await prisma.connectMachine.findMany({ where: { clientId: avant.clientId, id: { not: machineId } } })
      if (!restantes.some((m) => cleGroupe(m) === ancienne)) {
        await prisma.connectStockMouvement.updateMany({ where: { clientId: avant.clientId, groupe: ancienne }, data: { groupe: cleGroupe(apres) } })
      }
    }
  }
  revalidatePath('/parc', 'layout')
  return `Site enregistré : ${site} (${lues.length} machine${lues.length > 1 ? 's' : ''} mise${lues.length > 1 ? 's' : ''} à jour)`
}

// Retire un ordinateur de la liste (ancien PC, désinstallé) : il n'est plus surveillé.
export async function retirerPoste(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const p = await prisma.connectPoste.findUnique({ where: { id } })
  await prisma.connectPoste.deleteMany({ where: { id } })
  revalidatePath('/parc', 'layout')
  return p ? `${p.nom} retiré de la liste` : 'Retiré'
}

// Quand le lien a été transmis autrement que par le bouton (copié dans un mail, un SMS...).
export async function marquerLienEnvoye(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await prisma.connectClient.update({ where: { id }, data: { lienEnvoyeLe: new Date() } })
  await prisma.connectLienEvenement.create({ data: { clientId: id, type: 'note' } })
  revalidatePath('/parc', 'layout')
  return 'Noté : lien envoyé aujourd’hui'
}

// Import d'un relevé reçu en PDF / photo, après vérification à l'écran.
export type ElementImport = {
  clientId: number
  machineId: number | null // null = nouvelle machine
  serie: string
  modele: string
  ip: string
  compteurs: Record<string, { v: number; nom?: string }>
}

export async function enregistrerImport(json: string): Promise<string> {
  if (!connecte()) throw new Error('Non connecté')
  const { jour, elements } = JSON.parse(json) as { jour: string; elements: ElementImport[] }
  const aujourdhui = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
  const date = jour === aujourdhui || !dateValide(jour) ? new Date() : new Date(finDeJournee(jour).getTime() - 12 * 3600000)
  let nb = 0
  for (const e of elements) {
    const client = await prisma.connectClient.findUnique({ where: { id: Number(e.clientId) } })
    if (!client) throw new Error('Client introuvable')
    const serie = String(e.serie ?? '').trim().slice(0, 80) || null
    const ip = String(e.ip ?? '').trim().slice(0, 45) || null
    const modele = String(e.modele ?? '').trim().slice(0, 120) || null
    let machine = e.machineId ? await prisma.connectMachine.findUnique({ where: { id: Number(e.machineId) } }) : null
    if (!machine) {
      if (!serie && !ip) throw new Error('Une nouvelle machine a besoin d’un numéro de série ou d’une adresse IP.')
      const cle = serie ? `sn:${serie.toUpperCase()}` : `ip:${client.id}:${ip}`
      machine =
        (await prisma.connectMachine.findUnique({ where: { cle } })) ??
        (await prisma.connectMachine.create({
          data: {
            clientId: client.id,
            cle,
            numeroSerie: serie,
            ip,
            modele,
            marque: modele && /^(iR|image ?(RUNNER|FORCE)|i-?SENSYS)/i.test(modele) ? 'Canon' : null,
            categorie: modele && /^(iR|image ?(RUNNER|FORCE)|i-?SENSYS)/i.test(modele) ? 'mine' : 'autre',
            aVerifier: !modele,
          },
        }))
    }
    const compteurs: Record<string, { v: number; nom?: string }> = {}
    for (const [n, c] of Object.entries(e.compteurs ?? {})) {
      if (/^\d{1,4}$/.test(n) && c && Number.isFinite(c.v)) compteurs[n] = { v: Math.round(c.v), nom: c.nom ? String(c.nom).slice(0, 120) : undefined }
    }
    await prisma.connectReleve.create({ data: { machineId: machine.id, date, source: 'import', compteurs } })
    nb++
  }
  revalidatePath('/parc', 'layout')
  return `${nb} relevé${nb > 1 ? 's' : ''} enregistré${nb > 1 ? 's' : ''}.`
}
