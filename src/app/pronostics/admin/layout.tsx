import Link from 'next/link'

const links = [
  { href: '/pronostics/admin', label: "Vue d'ensemble" },
  { href: '/pronostics/admin/matches', label: 'Matchs' },
  { href: '/pronostics/admin/bareme', label: 'Barème de points' },
  { href: '/pronostics/admin/bonus', label: 'Questions bonus' },
  { href: '/pronostics/admin/joueurs', label: 'Joueurs' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b border-pitch-800 bg-pitch-900/40">
        <nav className="max-w-5xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-pitch-200 hover:text-white px-3 py-3 transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  )
}
