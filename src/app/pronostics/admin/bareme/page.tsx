import { getScoringRule } from '@/lib/scoring'
import { AdminBaremeForm } from '@/components/pronostics/admin/AdminBaremeForm'

export default async function AdminBaremePage() {
  const rule = await getScoringRule()

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Barème de points</h1>
      <AdminBaremeForm rule={rule} />
    </div>
  )
}
