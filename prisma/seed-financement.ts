// Initialisation du module financement (idempotent : peut être relancé sans doublons).
//   FIN_ADMIN_EMAIL=... FIN_ADMIN_MOT_DE_PASSE=... npx tsx prisma/seed-financement.ts
// Crée : le premier administrateur, le financeur Grenke, son barème réel et le barème commercial commun.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from '../src/lib/financement/baremes'

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL || process.env.DATABASE_URL_DATABASE_URL } } })

async function main() {
  const email = (process.env.FIN_ADMIN_EMAIL || '').trim().toLowerCase()
  const mdp = process.env.FIN_ADMIN_MOT_DE_PASSE || ''
  if (!email || mdp.length < 10) throw new Error('Renseignez FIN_ADMIN_EMAIL et FIN_ADMIN_MOT_DE_PASSE (10 caractères minimum).')

  if (!(await prisma.finUtilisateur.findUnique({ where: { email } }))) {
    await prisma.finUtilisateur.create({
      data: { email, prenom: 'Admin', nom: 'LEVAD', role: 'ADMIN', motDePasseHash: await bcrypt.hash(mdp, 10), doitChangerMotDePasse: true },
    })
    console.log(`Administrateur créé : ${email} (mot de passe à changer à la première connexion)`)
  }

  const grenke = await prisma.finFinanceur.upsert({
    where: { nom: 'Grenke' },
    update: {},
    create: { nom: 'Grenke', connecteur: 'manuel', majorationMensuelleBp: 150, commissionBp: 200, fraisDossierCentimes: 0 },
  })

  const existe = (type: string) => prisma.finGrille.findFirst({ where: { financeurId: grenke.id, type, utilisateurId: null } })
  if (!(await existe('REELLE'))) {
    await prisma.finGrille.create({ data: { financeurId: grenke.id, type: 'REELLE', base: 'MENSUEL', lignes: { create: GRENKE_REEL_LIGNES } } })
    console.log('Barème réel Grenke créé')
  }
  if (!(await existe('COMMERCIALE'))) {
    await prisma.finGrille.create({ data: { financeurId: grenke.id, type: 'COMMERCIALE', base: 'TRIMESTRIEL', lignes: { create: COMMERCIAL_LIGNES } } })
    console.log('Barème commercial commun créé')
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
