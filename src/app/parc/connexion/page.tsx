import type { Metadata, Viewport } from 'next'
import { connectMetadata, connectViewport } from '@/lib/connect/metadata'
import { motDePasseConfigure } from '@/lib/connect/auth'
import { VERT } from '@/components/connect/affichage'

export const metadata: Metadata = { ...connectMetadata, title: 'Levad Connect — Connexion' }
export const viewport: Viewport = connectViewport

export const dynamic = 'force-dynamic'

export default function Connexion({ searchParams }: { searchParams: { erreur?: string } }) {
  const configure = Boolean(motDePasseConfigure())
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/levad-logo.png" alt="LEVAD" className="h-12 w-auto" />
        <h1 className="mt-6 text-xl font-bold">Suivi du parc</h1>
        {configure ? (
          <form action="/api/parc/connexion" method="post" className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Identifiant
              <input
                type="text"
                name="identifiant"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Mot de passe
              <input
                type="password"
                name="motdepasse"
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            {searchParams.erreur && <p className="text-sm text-red-600">Identifiant ou mot de passe incorrect.</p>}
            <button className="w-full rounded-lg px-4 py-2.5 font-semibold text-white" style={{ backgroundColor: VERT }}>
              Se connecter
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            Le mot de passe n&apos;est pas encore configuré. Dans Vercel, ajoutez la variable{' '}
            <strong>PARC_PASSWORD</strong> (le mot de passe de votre choix), puis redéployez.
          </p>
        )}
      </div>
    </main>
  )
}
