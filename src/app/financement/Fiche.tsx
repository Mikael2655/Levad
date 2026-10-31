// Éléments communs aux fiches (demande, contrat) : titre de rubrique avec pastille, ligne « libellé : valeur ».
export const TitreSection = ({ children }: { icone?: string; children: React.ReactNode }) => (
  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 pb-2 mb-1 border-b border-gray-200">{children}</h2>
)

export const Ligne = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="flex gap-3 py-2.5 text-sm border-b border-gray-100 last:border-0">
    <span className="w-44 shrink-0 text-gray-500">{t}</span>
    <span className="text-gray-900 min-w-0 break-words">{children}</span>
  </div>
)
