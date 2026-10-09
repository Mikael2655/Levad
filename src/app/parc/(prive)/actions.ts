'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { connecte } from '@/lib/connect/auth'
import { COULEURS, stockCourant } from '@/lib/connect/alertes'
import { cleGroupe, gammeParCode } from '@/lib/connect/gammes'
import { assurerCode, regenererCode, urlLien } from '@/lib/connect/agent'
import { envoyerMail } from '@/lib/connect/mail'

const seuil = (v: FormDataEntryValue | null) => Math.min(100, Math.max(0, Number(v ?? 25) || 0))

// Actions du tableau de bord (réglages d'une machine, renommage d'un client). Toutes exigent d'être connecté.

export async function enregistrerReglages(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const recette = String(formData.get('recette') ?? '')
  const categorie = String(formData.get('categorie') ?? 'mine') === 'autre' ? 'autre' : 'mine'
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
      recette: ['A', 'B', 'C'].includes(recette) ? recette : null,
      categorie,
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
  if (code && !gammeParCode(code)) return '!Gamme inconnue'
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
  return code ? `Gamme enregistrée : ${code}` : 'Gamme remise en automatique'
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
  const data: { clientId: number; groupe: string; couleur: string; delta: number; motif: string; note: string | null; date: Date }[] = []
  for (let i = 0; i < 100; i++) {
    const groupe = formData.get(`groupe_${i}`)
    if (groupe === null) break
    if (!valides.has(String(groupe))) continue
    for (const couleur of COULEURS) {
      const q = Math.floor(Number(formData.get(`qte_${i}_${couleur}`)) || 0)
      if (q >= 1) data.push({ clientId, groupe: String(groupe), couleur, delta: Math.min(q, 999), motif: 'envoi', note, date })
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
  const voulu = Math.max(0, Math.floor(Number(formData.get('quantite'))))
  if (!clientId || !(COULEURS as readonly string[]).includes(couleur) || Number.isNaN(voulu) || !(await groupesValides(clientId)).has(groupe)) return '!Valeur invalide'
  const actuel = Math.max(0, await stockCourant(clientId, groupe, couleur))
  if (voulu === actuel) return 'Déjà à cette quantité : rien à changer'
  await prisma.connectStockMouvement.create({
    data: { clientId, groupe, couleur, delta: voulu - actuel, motif: 'correction', note: `Corrigé de ${actuel} à ${voulu}` },
  })
  revalidatePath('/parc', 'layout')
  return `Stock corrigé : ${voulu}`
}

// ---- Programme résident : lien personnel du client ------------------------------------------

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
  revalidatePath(`/parc/client/${id}`)
}

export async function majClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const email = String(formData.get('email') ?? '').trim().slice(0, 200) || null
  const modeReleve = String(formData.get('modeReleve') ?? 'agent') === 'manuel' ? 'manuel' : 'agent'
  const jours = Math.min(90, Math.max(1, Math.floor(Number(formData.get('seuilDeconnexionJours')) || 10)))
  await prisma.connectClient.update({ where: { id }, data: { email, modeReleve, seuilDeconnexionJours: jours } })
  revalidatePath(`/parc/client/${id}`)
  revalidatePath('/parc/connexions')
}

// Envoie le lien d'installation au client par mail, en un clic.
export async function envoyerLien(formData: FormData): Promise<string | void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const email = String(formData.get('email') ?? '').trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return '!Adresse mail invalide'
  const client = await prisma.connectClient.findUnique({ where: { id } })
  if (!client) return '!Client introuvable'
  const lien = urlLien(await assurerCode(id))
  await envoyerMail({
    to: email,
    sujet: 'Levad Connect : installer le relevé de vos copieurs',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <p>Bonjour,</p>
  <p>Pour suivre automatiquement les compteurs et les niveaux de toner de vos copieurs, nous vous proposons d'installer
  <strong>Levad Connect</strong>, un petit programme à installer une seule fois. Il fonctionne ensuite tout seul, en arrière-plan.</p>
  <p style="margin:24px 0"><a href="${lien}" style="background:#8c9e8b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Installer Levad Connect</a></p>
  <p>Le programme ne fait que lire vos copieurs, ne modifie aucun réglage, et peut être désinstallé à tout moment.
  Ce lien est personnel : en cas de changement d'ordinateur, il suffit de le réutiliser.</p>
  <p style="margin-bottom:6px">Cordialement,</p>
  <img src="${process.env.PARC_URL || 'https://connect.levad.fr'}/signature-levad.png" width="260" alt="LEVAD - www.levad.fr - 01 70 72 19 40" style="display:block;border:0">
</body></html>`,
  })
  await prisma.connectClient.update({ where: { id }, data: { email } })
  revalidatePath(`/parc/client/${id}`)
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

// ---- Machine hors contrat : plus d'alerte d'encre, et exclue des exports -------------------------

export async function basculerHorsContrat(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const m = await prisma.connectMachine.findUnique({ where: { id }, select: { horsContrat: true } })
  if (!m) return
  await prisma.connectMachine.update({ where: { id }, data: { horsContrat: !m.horsContrat } })
  revalidatePath('/parc', 'layout')
}

// Depuis la synthèse : crée le lien du client s'il n'existe pas, puis ouvre sa fiche sur le lien à envoyer.
export async function preparerLien(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await assurerCode(id)
  revalidatePath(`/parc/client/${id}`)
  redirect(`/parc/client/${id}#lien`)
}
