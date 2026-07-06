import Link from 'next/link'

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { competitionId: string }
}) {
  const base = `/pronostics/${params.competitionId}/admin`
  const links = [
    { href: base, label: "Vue d'ensemble" },
    { href: `${base}/phases`, label: 'Phases & barème' },
    { href: `${base}/matches`, label: 'Matchs' },
    { href: `${base}/bonus`, label: 'Questions bonus' },
    { href: `${base}/joueurs`, label: 'Joueurs' },
  ]

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
