import { redirect } from 'next/navigation'

export default function AdminHomePage({ params }: { params: { competitionId: string } }) {
  redirect(`/pronostics/${params.competitionId}/admin/bareme`)
}
