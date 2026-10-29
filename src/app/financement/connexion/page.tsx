import FormulaireConnexion from './FormulaireConnexion'
import { metadataFinancement, viewportFinancement } from '@/lib/financement/metadata'

export const metadata = metadataFinancement
export const viewport = viewportFinancement
export const dynamic = 'force-dynamic'

export default function PageConnexion({ searchParams }: { searchParams: { suite?: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-leasing-100 via-leasing-50 to-white flex items-center justify-center p-4">
      <FormulaireConnexion suite={searchParams.suite} />
    </div>
  )
}
