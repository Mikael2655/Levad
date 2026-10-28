// Première installation : crée le premier administrateur, Grenke et ses barèmes de départ, depuis une page web.
// Sécurité : désactivée tant que la variable d'environnement FIN_INSTALL_CODE (20 caractères minimum) n'existe pas ;
// protégée par ce code ; se verrouille définitivement dès qu'un administrateur existe.
import { createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'
import { creerFinanceur, creerUtilisateur, enregistrerGrille } from './admin'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from './baremes'
import { ErreurMetier } from './erreurs'
import { lignesVersMatrice } from './grilles'

export type EtatInstallation = 'DESACTIVEE' | 'DEJA_INSTALLEE' | 'POSSIBLE' | 'BASE_NON_PRETE'

export async function etatInstallation(): Promise<EtatInstallation> {
  const code = process.env.FIN_INSTALL_CODE
  if (!code || code.length < 20) return 'DESACTIVEE'
  try {
    return (await prisma.finUtilisateur.count({ where: { role: 'ADMIN' } })) > 0 ? 'DEJA_INSTALLEE' : 'POSSIBLE'
  } catch (e) {
    // le plus fréquent : le script SQL des tables « fin_* » n'a pas encore été exécuté (code Prisma P2021)
    console.error('Installation : base de données inutilisable', e)
    return 'BASE_NON_PRETE'
  }
}

// Aide au dépannage affichée sur la page d'installation quand elle est désactivée : jamais la valeur du code.
export function diagnosticInstallation() {
  const code = process.env.FIN_INSTALL_CODE
  return {
    environnement: process.env.VERCEL_ENV ?? 'inconnu', // production | preview | development
    branche: process.env.VERCEL_GIT_COMMIT_REF ?? 'inconnue',
    variable: !code ? ('ABSENTE' as const) : code.length < 20 ? ('TROP_COURTE' as const) : ('OK' as const),
    version: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || 'inconnue', // à comparer avec la liste des déploiements Vercel
    // noms (jamais les valeurs) des variables qui ressemblent à celle attendue : repère une faute de frappe dans le nom
    nomsProches: Object.keys(process.env).filter(k => /install|^fin/i.test(k)).sort(),
  }
}

const empreinte = (s: string) => createHash('sha256').update(s).digest()

export async function installer(d: { code: string; email: string; prenom: string; nom: string }) {
  const etat = await etatInstallation()
  if (etat === 'DESACTIVEE') throw new ErreurMetier('Installation indisponible.', 404)
  if (etat === 'BASE_NON_PRETE') throw new ErreurMetier('La base de données n’est pas prête : exécutez d’abord le script SQL des tables.', 503)
  if (etat === 'DEJA_INSTALLEE') throw new ErreurMetier('L’outil est déjà installé.', 410)
  if (!timingSafeEqual(empreinte(d.code), empreinte(process.env.FIN_INSTALL_CODE!))) throw new ErreurMetier('Code d’installation incorrect.', 403)

  const { utilisateur, motDePasseProvisoire } = await creerUtilisateur({ email: d.email, prenom: d.prenom, nom: d.nom, role: 'ADMIN' })

  const grenke = (await prisma.finFinanceur.findUnique({ where: { nom: 'Grenke' } })) ?? (await creerFinanceur({ nom: 'Grenke', majorationMensuelleBp: 150, commissionBp: 200, fraisDossierCentimes: 0 }))
  const sans = { financeurId: grenke.id, utilisateurId: null }
  if (!(await prisma.finGrille.findFirst({ where: { ...sans, type: 'REELLE' } }))) await enregistrerGrille({ ...sans, type: 'REELLE' }, 'MENSUEL', lignesVersMatrice(GRENKE_REEL_LIGNES))
  if (!(await prisma.finGrille.findFirst({ where: { ...sans, type: 'COMMERCIALE' } }))) await enregistrerGrille({ ...sans, type: 'COMMERCIALE' }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES))

  return { email: utilisateur.email, motDePasseProvisoire }
}
