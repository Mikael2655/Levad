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
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Administration</h1>
      {base && !base.ok && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-900 space-y-1">
          <p className="font-semibold">La base de données n’est pas à jour : certaines pages vont afficher une erreur.</p>
          <p>Éléments manquants : <code>{base.manquantes.join(', ')}</code></p>
          <p>À faire : exécuter dans la console SQL de Neon {base.scripts.map(s => <code key={s} className="mx-1">{s.replace('prisma/migrations/', '')}</code>)} (fichier{base.scripts.length > 1 ? 's' : ''} du dossier <code>prisma/migrations</code> du dépôt), puis recharger cette page.</p>
        </div>
      )}
      {base?.ok && <p className="text-sm text-green-700">✅ Base de données à jour.</p>}
      {base === null && <p className="text-sm text-amber-800">Le contrôle de la base de données n’a pas pu être fait (base inaccessible ?).</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {RUBRIQUES.map(r => (
          <Link key={r.href} href={r.href} className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-5 hover:border-leasing-700">
            <p className="font-semibold text-gray-900">{r.titre}</p>
            <p className="text-sm text-gray-500 mt-1">{r.texte}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
