import Link from 'next/link'
import { prisma } from '@/lib/db'
import { MAX_PLAYERS } from '@/lib/scoring'
import { RegisterForm } from '@/components/pronostics/RegisterForm'

export default async function RegisterPage() {
  const playerCount = await prisma.player.count()
  const isFull = playerCount >= MAX_PLAYERS

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-pitch-900 border border-pitch-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-1 text-center">Inscription</h1>
        <p className="text-center text-sm text-pitch-300 mb-6">
          {playerCount} / {MAX_PLAYERS} places prises
        </p>

        {isFull ? (
          <p className="text-center text-red-300 bg-red-950/50 border border-red-800 rounded-lg px-3 py-3">
            Le concours est complet, les inscriptions sont closes.
          </p>
        ) : (
          <RegisterForm />
        )}

        <p className="text-sm text-pitch-300 text-center mt-6">
          Déjà inscrit ?{' '}
          <Link href="/pronostics/login" className="text-gold-400 font-semibold hover:underline">
            Connecte-toi
          </Link>
        </p>
      </div>
    </div>
  )
}
