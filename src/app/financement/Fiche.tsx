// Éléments communs aux fiches (demande, contrat) : titre de rubrique avec pastille, ligne « libellé : valeur ».
const CHEMINS: Record<string, string> = {
  client: 'M4 21V7l8-4 8 4v14M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01',
  financement: 'M17 7a6 6 0 1 0 0 10M5 10h8M5 14h8',
  materiel: 'M6 9V4h12v5M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2M8 14h8v7H8v-7Z',
  signature: 'M4 17c2-4 3-9 5-9s1 6 3 6 2-3 4-3 2 3 4 3M3 21h18',
  historique: 'M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7M3 4v4h4',
  piece: 'm21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7',
  contrat: 'M7 3h8l4 4v14H7V3ZM15 3v4h4M10 12h6M10 16h6',
  solde: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 5v4h-4M4 19v-4h4',
  modifier: 'M4 20h4L19 9l-4-4L4 16v4Z',
}
// Titre de rubrique : pastille douce avec une icône simple, puis le titre.
export const TitreSection = ({ icone, children }: { icone?: keyof typeof CHEMINS; children: React.ReactNode }) => (
  <h2 className="flex items-center gap-3 text-base font-semibold text-gray-900 pb-3 mb-1">
    {icone && (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden><path d={CHEMINS[icone]} /></svg>
      </span>
    )}
    {children}
  </h2>
)

export const Ligne = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="flex gap-3 py-3 text-sm border-b border-black/5 last:border-0">
    <span className="w-44 shrink-0 text-gray-500">{t}</span>
    <span className="text-gray-900 min-w-0 break-words">{children}</span>
  </div>
)
