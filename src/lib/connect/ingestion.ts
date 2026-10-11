import { prisma } from '@/lib/db'
import { cleClient } from './normaliser'
import { COULEURS, varianteADecompter } from './alertes'
import { cleGroupe } from './gammes'

// Enregistre dans la base les relevés envoyés par le programme Levad Connect.
// Une société est reconnue par son nom simplifié ; une machine par son numéro de série.

type Json = any

function texte(v: unknown, max = 200): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : null
}

// `clientImpose` : relevé envoyé par le programme résident, dont le client est connu par son lien personnel.
export async function enregistrerReleve(data: Json, clientImpose?: { id: number }) {
  const nomSaisi = texte(data.societe, 120) || '(non indiqué)'
  // La société n'est créée que si une machine nouvelle doit lui être rattachée
  // (une machine déjà connue reste chez le client auquel elle a été rattachée).
  let client: { id: number } | null = clientImpose ?? null
  const clientPourMachineNouvelle = async () =>
    (client ??= await prisma.connectClient.upsert({
      where: { cle: cleClient(nomSaisi) },
      update: {},
      create: { nom: nomSaisi, cle: cleClient(nomSaisi) },
    }))

  let nb = 0
  for (const m of Array.isArray(data.machines) ? data.machines : []) {
    // seules les imprimantes lues nous intéressent (le programme retire déjà les autres équipements)
    if (!m || !m.repond || (m.brut === undefined && !m.est_imprimante)) continue

    const serie = texte(m.numero_serie, 80)
    const ip = texte(m.ip, 45)
    const marque = texte(m.marque, 60)
    const modele = texte(m.modele, 120)

    // sans numéro de série, on reconnaît la machine par son adresse IP chez ce client
    let cle = serie ? `sn:${serie.toUpperCase()}` : ''
    let machine = cle ? await prisma.connectMachine.findUnique({ where: { cle } }) : null
    if (!machine && !serie) {
      const c = await clientPourMachineNouvelle()
      cle = `ip:${c.id}:${ip ?? 'inconnue'}`
      machine = await prisma.connectMachine.findUnique({ where: { cle } })
    }
    if (machine) {
      // à chaque relevé on met à jour ce que la machine déclare ; les choix faits à la main sont conservés
      machine = await prisma.connectMachine.update({
        where: { id: machine.id },
        data: { ip, marque: marque ?? undefined, modele: modele ?? undefined },
      })
    } else {
      const c = await clientPourMachineNouvelle()
      // une machine nouvelle prend le site de l'ordinateur qui l'a découverte (réglé dans la fiche du client)
      const nomPc = texte(data.pc, 80)
      const poste = nomPc ? await prisma.connectPoste.findUnique({ where: { clientId_nom: { clientId: c.id, nom: nomPc } } }) : null
      machine = await prisma.connectMachine.create({
        data: {
          clientId: c.id,
          site: poste?.site ?? 'Site principal',
          cle,
          numeroSerie: serie,
          marque,
          modele,
          ip,
          categorie: marque === 'Canon' ? 'mine' : 'autre',
          aVerifier: !marque || !modele,
        },
      })
    }

    const compteurs: Record<string, { v: number; nom?: string }> = {}
    for (const [n, c] of Object.entries<Json>(m.compteurs_canon ?? {})) {
      if (c && typeof c.valeur === 'number') compteurs[n] = { v: c.valeur, nom: texte(c.nom, 120) ?? undefined }
    }
    const simplifier = (liste: Json) =>
      (Array.isArray(liste) ? liste : []).map((e: Json) => ({
        couleur: e.couleur ?? null,
        pourcent: typeof e.pourcent === 'number' ? e.pourcent : null,
        description: texte(e.description, 120),
        note: texte(e.note, 120),
      }))

    const encres = simplifier(m.encres)

    // Changement de cartouche : le niveau d'une couleur remonte à 100 % alors qu'il était plus bas
    // au relevé précédent -> on retire une cartouche du stock du client (jamais en dessous de zéro).
    if (machine.categorie === 'mine' && !machine.horsContrat) {
      const groupe = cleGroupe(machine)
      const precedent = await prisma.connectReleve.findFirst({
        where: { machineId: machine.id },
        orderBy: { date: 'desc' },
        select: { encres: true },
      })
      const avant = (precedent?.encres ?? []) as Json[]
      for (const e of encres) {
        if (e.pourcent !== 100 || !e.couleur || !(COULEURS as readonly string[]).includes(e.couleur)) continue
        const p = avant.find((x: Json) => x.couleur === e.couleur)?.pourcent
        if (typeof p !== 'number' || p >= 100) continue
        const variante = await varianteADecompter(machine.clientId, groupe, e.couleur)
        if (variante !== null) {
          await prisma.connectStockMouvement.create({
            data: {
              clientId: machine.clientId,
              groupe,
              variante,
              couleur: e.couleur,
              delta: -1,
              motif: 'changement',
              note: `Cartouche changée détectée (niveau passé de ${p} % à 100 %)`,
              machineId: machine.id,
            },
          })
        }
      }
    }

    await prisma.connectReleve.create({
      data: {
        machineId: machine.id,
        compteurs,
        encres,
        bacs: simplifier(m.bacs_recuperateurs),
        totalStandard: typeof m.compteur_total_standard === 'number' ? m.compteur_total_standard : null,
        source: texte(data.source, 20) ?? 'connect',
        versionSnmp: texte(m.version_snmp, 10),
        pc: texte(data.pc, 80),
      },
    })
    nb++
  }
  return { machines: nb }
}
