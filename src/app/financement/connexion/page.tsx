import FormulaireConnexion from './FormulaireConnexion'
import { metadataFinancement, viewportFinancement } from '@/lib/financement/metadata'

export const metadata = metadataFinancement
export const viewport = viewportFinancement
export const dynamic = 'force-dynamic'

export default function PageConnexion({ searchParams }: { searchParams: { suite?: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <FormulaireConnexion suite={searchParams.suite} />
    </div>
  )
}
