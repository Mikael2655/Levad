import FormulaireConnexion from './FormulaireConnexion'
import { appMetadata, appViewport } from '@/lib/app-metadata'

export const metadata = appMetadata
export const viewport = appViewport
export const dynamic = 'force-dynamic'

export default function PageConnexion({ searchParams }: { searchParams: { suite?: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <FormulaireConnexion suite={searchParams.suite} />
    </div>
  )
}
