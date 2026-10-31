import Link from 'next/link'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { verifierSchemaBase } from '@/lib/financement/schema-base'

export const dynamic = 'force-dynamic'

const RUBRIQUES = [
  { href: '/financement/admin/utilisateurs', titre: 'Utilisateurs', texte: 'Créer les comptes, choisir les rôles, réinitialiser un mot de passe.' },
  { href: '/financement/admin/financeurs', titre: 'Financeurs', texte: 'Paramètres de chaque financeur (majoration mensuelle, commission, connecteur).' },
  { href: '/financement/mot-de-passe', titre: 'Mon mot de passe', texte: 'Changer le mot de passe de votre compte administrateur.' },
  { href: '/financement/admin/notifications', titre: 'Notifications', texte: 'Qui reçoit les e-mails (LEVAD doit signer, dossier complet) et journal des envois.' },
  { href: '/financement/admin/transfert', titre: 'Transfert de contrats', texte: 'Passer tous les contrats d’un commercial à un autre (départ, réorganisation).' },
  { href: '/financement/admin/grenke', titre: 'Connexion Grenke', texte: 'État de la liaison avec l’API Grenke, essais en lecture seule, aperçu des demandes.' },
  { href: '/financement/admin/grilles', titre: 'Barèmes', texte: 'Barème réel du financeur, barème commun des commerciaux, barèmes propres à un commercial.' },
]

export default async function AdminAccueil() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const base = await verifierSchemaBase().catch(() => null)
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Administration</h1>
        <p className="text-sm text-gray-500 mt-1">Utilisateurs, financeurs, barèmes et réglages de l’outil.</p>
      </div>
      {base && !base.ok && (
        <div className="bg-red-50 border border-red-300 rounded-md px-4 py-3 text-sm text-red-900 space-y-1">
          <p className="font-semibold">La base de données n’est pas à jour : certaines pages vont afficher une erreur.</p>
          <p>Éléments manquants : <code>{base.manquantes.join(', ')}</code></p>
          <p>À faire : exécuter dans la console SQL de Neon {base.scripts.map(s => <code key={s} className="mx-1">{s.replace('prisma/migrations/', '')}</code>)} (fichier{base.scripts.length > 1 ? 's' : ''} du dossier <code>prisma/migrations</code> du dépôt), puis recharger cette page.</p>
        </div>
      )}
      {base?.ok && <p className="text-sm text-green-700">✅ Base de données à jour.</p>}
      {base === null && <p className="text-sm text-amber-800">Le contrôle de la base de données n’a pas pu être fait (base inaccessible ?).</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {RUBRIQUES.map(r => (
          <Link key={r.href} href={r.href} className="bg-white border border-gray-200 rounded-lg p-5 hover:border-leasing-600 transition-colors">
            <span className="block font-semibold text-gray-900">{r.titre}</span>
            <span className="block text-sm text-gray-500 mt-1">{r.texte}</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
