import Link from 'next/link'
import { CreateCompetitionForm } from '@/components/pronostics/CreateCompetitionForm'

export default function CreateCompetitionPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <Link href="/pronostics" className="text-sm text-pitch-300 hover:text-gray-900 transition">
        ← Retour
      </Link>
      <div className="bg-pitch-900 border border-pitch-800 rounded-2xl p-8 mt-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Créer une compétition</h1>
        <CreateCompetitionForm />
        <p className="text-xs text-pitch-400 text-center mt-6">
          Un code d'accès unique sera généré : donne-le uniquement aux personnes que tu veux inviter.
        </p>
      </div>
    </div>
  )
}
