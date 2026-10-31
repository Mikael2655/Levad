import Link from 'next/link'

export default function RetourAdmin() {
  return <Link href="/financement/admin" className="inline-block text-sm text-gray-500 hover:text-accent-700 bg-white border border-gray-300 rounded-xl px-3 py-1 transition-colors">← Administration</Link>
}
