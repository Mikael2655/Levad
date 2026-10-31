import Link from 'next/link'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { verifierSchemaBase } from '@/lib/financement/schema-base'

export const dynamic = 'force-dynamic'

const RUBRIQUES = [
  { href: '/financement/admin/utilisateurs', icone: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1a3.5 3.5 0 0 0-2.5-3.4M16 4.2a3.5 3.5 0 0 1 0 6.6', titre: 'Utilisateurs', texte: 'Créer les comptes, choisir les rôles, réinitialiser un mot de passe.' },
  { href: '/financement/admin/financeurs', icone: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6', titre: 'Financeurs', texte: 'Paramètres de chaque financeur (majoration mensuelle, commission, connecteur).' },
  { href: '/financement/mot-de-passe', icone: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z', titre: 'Mon mot de passe', texte: 'Changer le mot de passe de votre compte administrateur.' },
  { href: '/financement/admin/notifications', icone: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0', titre: 'Notifications', texte: 'Qui reçoit les e-mails (LEVAD doit signer, dossier complet) et journal des envois.' },
  { href: '/financement/admin/transfert', icone: 'M4 8h14l-3-3M20 16H6l3 3', titre: 'Transfert de contrats', texte: 'Passer tous les contrats d’un commercial à un autre (départ, réorganisation).' },
  { href: '/financement/admin/grenke', icone: 'M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0V8ZM12 17v4', titre: 'Connexion Grenke', texte: 'État de la liaison avec l’API Grenke, essais en lecture seule, aperçu des demandes.' },
  { href: '/financement/admin/grilles', icone: 'M5 21V10M12 21V4M19 21v-7', titre: 'Barèmes', texte: 'Barème réel du financeur, barème commun des commerciaux, barèmes propres à un commercial.' },
]

export default async function AdminAccueil() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const base = await verifierSchemaBase().catch(() => null)
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Administration</h1>
        <p className="text-sm text-gray-500 mt-1">Les réglages de l’outil, au même endroit : comptes, financeurs, barèmes et notifications.</p>
      </div>
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
          <Link key={r.href} href={r.href} className="carte group flex gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 group-hover:bg-accent-100 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden><path d={r.icone} /></svg>
            </span>
            <span>
              <span className="block font-semibold text-gray-900">{r.titre}</span>
              <span className="block text-sm text-gray-500 mt-1">{r.texte}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
