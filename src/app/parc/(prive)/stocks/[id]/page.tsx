import { redirect } from 'next/navigation'

export default function StockClientPage({ params }: { params: { id: string } }) {
  redirect(`/parc/client/${params.id}#stock`)
}
