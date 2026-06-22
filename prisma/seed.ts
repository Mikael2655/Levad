import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const leads = [
    { firstName: 'Marie', lastName: 'Dupont', email: 'marie.dupont@acmecorp.fr', phone: '0601020304', company: 'ACME Corp', jobTitle: 'Directrice Générale', product: 'impression', status: 'gagne', source: 'formulaire', message: 'Besoin de 5 imprimantes multifonctions pour nos bureaux.' },
    { firstName: 'Jean', lastName: 'Martin', email: 'j.martin@techsolutions.fr', phone: '0612345678', company: 'Tech Solutions', jobTitle: 'DSI', product: 'informatique', status: 'proposition', source: 'telephone', message: 'Renouvellement complet du parc informatique.' },
    { firstName: 'Sophie', lastName: 'Bernard', email: 's.bernard@cabinet-avocats.fr', phone: '0698765432', company: 'Cabinet Lefèvre', jobTitle: 'Associée', product: 'ged', status: 'qualifie', source: 'recommandation', message: 'Numérisation et archivage de dossiers clients.' },
    { firstName: 'Pierre', lastName: 'Leroy', email: 'pleroy@batiment-pro.fr', phone: '0645671234', company: 'Bâtiment Pro', jobTitle: 'Gérant', product: 'telephonie', status: 'nouveau', source: 'formulaire', message: 'Mise en place d\'un standard téléphonique pour 20 postes.' },
    { firstName: 'Isabelle', lastName: 'Moreau', email: 'i.moreau@pharmacie-centrale.fr', company: 'Pharmacie Centrale', jobTitle: 'Pharmacienne', product: 'impression', status: 'nouveau', source: 'formulaire' },
    { firstName: 'François', lastName: 'Petit', email: 'f.petit@logistique-express.fr', phone: '0677889900', company: 'Logistique Express', jobTitle: 'Responsable IT', product: 'informatique', status: 'qualifie', source: 'salon', message: 'Infrastructure réseau pour nouvel entrepôt.' },
    { firstName: 'Claire', lastName: 'Simon', email: 'c.simon@ecole-privee.fr', phone: '0611223344', company: 'École Privée Saint-Joseph', jobTitle: 'Directrice', product: 'ged', status: 'perdu', source: 'formulaire', message: 'Gestion documentaire pour dossiers élèves.' },
    { firstName: 'Luc', lastName: 'Laurent', email: 'l.laurent@cabinet-comptable.fr', phone: '0655443322', company: 'Cabinet Aubert & Associés', jobTitle: 'Expert-Comptable', product: 'telephonie', status: 'gagne', source: 'recommandation', message: 'VoIP pour 8 collaborateurs.' },
    { firstName: 'Nathalie', lastName: 'Garcia', email: 'n.garcia@clinique-nord.fr', phone: '0634567890', company: 'Clinique du Nord', jobTitle: 'Directrice Administrative', product: 'impression', status: 'proposition', source: 'telephone', message: 'Contrat maintenance imprimantes + fournitures.' },
    { firstName: 'Thomas', lastName: 'Roux', email: 't.roux@startup-tech.fr', company: 'StartupTech', jobTitle: 'CTO', product: 'informatique', status: 'nouveau', source: 'formulaire', message: 'Setup réseau et serveurs pour équipe de 15 personnes.' },
  ]

  for (const lead of leads) {
    await prisma.lead.create({ data: lead })
  }

  console.log('✅ Seed data created successfully')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
