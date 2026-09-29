import { LeadStatus, STATUS_LABELS } from '@/lib/types'
import clsx from 'clsx'

const STATUS_COLORS: Record<LeadStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  qualifie: 'bg-yellow-100 text-yellow-800',
  proposition: 'bg-orange-100 text-orange-800',
  gagne: 'bg-green-100 text-green-800',
  perdu: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}
