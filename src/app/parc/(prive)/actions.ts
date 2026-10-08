'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { connecte } from '@/lib/connect/auth'
import { COULEURS, stockCourant } from '@/lib/connect/alertes'
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

  await prisma.connectMachine.update({
    where: { id },
    data: {
      recette: ['A', 'B', 'C'].includes(recette) ? recette : null,
      categorie,
      nomAffiche,
      seuilNoir: seuil(formData.get('seuilNoir')),
      seuilCyan: seuil(formData.get('seuilCyan')),
      seuilMagenta: seuil(formData.get('seuilMagenta')),
      seuilJaune: seuil(formData.get('seuilJaune')),
      aVerifier: false, // la machine a été relue et réglée à la main
      ...(clientId ? { clientId } : {}),
    },
  })
  revalidatePath('/parc')
  revalidatePath(`/parc/machine/${id}`)
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

// Saisie d'un envoi de cartouches à un client : plusieurs couleurs d'un coup (une quantité par couleur, 0 = rien).
export async function ajouterEnvoi(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('clientId'))
  const note = String(formData.get('note') ?? '').trim().slice(0, 200) || null
  const dateSaisie = String(formData.get('date') ?? '')
  if (!clientId) return
  const date = dateSaisie && !Number.isNaN(Date.parse(dateSaisie)) ? new Date(dateSaisie) : new Date()
  const data = COULEURS.map((couleur) => ({ couleur, quantite: Math.floor(Number(formData.get(`qte_${couleur}`)) || 0) }))
    .filter((l) => l.quantite >= 1)
    .map((l) => ({ clientId, couleur: l.couleur, delta: Math.min(l.quantite, 999), motif: 'envoi', note, date }))
  if (data.length) await prisma.connectStockMouvement.createMany({ data })
  revalidatePath('/parc', 'layout')
  redirect(`/parc/stocks/${clientId}${data.length ? '?ok=1' : ''}`)
}

// Correction manuelle du stock : on indique la quantité réelle, le programme enregistre la différence.
export async function corrigerStock(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('clientId'))
  const couleur = String(formData.get('couleur') ?? '')
  const voulu = Math.max(0, Math.floor(Number(formData.get('quantite'))))
  if (!clientId || !(COULEURS as readonly string[]).includes(couleur) || Number.isNaN(voulu)) return
  const actuel = Math.max(0, await stockCourant(clientId, couleur))
  if (voulu === actuel) return
  await prisma.connectStockMouvement.create({
    data: { clientId, couleur, delta: voulu - actuel, motif: 'correction', note: `Corrigé de ${actuel} à ${voulu}` },
  })
  revalidatePath('/parc', 'layout')
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
export async function envoyerLien(formData: FormData): Promise<void> {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const email = String(formData.get('email') ?? '').trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
  const client = await prisma.connectClient.findUnique({ where: { id } })
  if (!client) return
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
  <ol>
    <li>Cliquez sur le bouton ci-dessus, puis téléchargez le programme.</li>
    <li>Ouvrez-le (si Windows affiche un message de protection : « Informations complémentaires », puis « Exécuter quand même »).</li>
    <li>Cliquez sur « Installer ». C'est terminé.</li>
  </ol>
  <p>Le programme ne fait que lire vos copieurs, ne modifie aucun réglage, et peut être désinstallé à tout moment.
  Ce lien est personnel : en cas de changement d'ordinateur, il suffit de le réutiliser.</p>
  <p>Cordialement,<br>LEVAD</p>
</body></html>`,
  })
  await prisma.connectClient.update({ where: { id }, data: { email } })
  revalidatePath(`/parc/client/${id}`)
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
