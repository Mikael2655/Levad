import Link from 'next/link'
import { LoginForm } from '@/components/pronostics/LoginForm'

export default function LoginPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-pitch-900 border border-pitch-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>
        <LoginForm competitionId={competitionId} />
        <p className="text-sm text-pitch-300 text-center mt-6">
          Pas encore de compte ?{' '}
          <Link href={`/pronostics/${competitionId}/register`} className="text-gold-400 font-semibold hover:underline">
            Inscris-toi
          </Link>
        </p>
      </div>
    </div>
  )
}
