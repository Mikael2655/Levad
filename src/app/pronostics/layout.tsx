export const metadata = {
  title: 'Pronostics Foot',
  description: 'Concours de pronostics de football entre amis : compétitions, matchs, questions bonus et classement.',
}

export default function PronosticsRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-pitch-950 text-gray-900">{children}</div>
}
