// Éléments communs aux fiches (demande, contrat) : titre de rubrique avec pastille, ligne « libellé : valeur ».
export const TitreSection = ({ icone, children }: { icone: string; children: React.ReactNode }) => (
  <h2 className="flex items-center gap-2.5 font-semibold text-gray-900 mb-3">
    <span className="w-8 h-8 rounded-lg bg-leasing-100 flex items-center justify-center text-base" aria-hidden>{icone}</span>
    {children}
  </h2>
)

export const Ligne = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="flex gap-3 py-2 text-sm border-b border-gray-100 last:border-0">
    <span className="w-44 shrink-0 text-gray-500">{t}</span>
    <span className="text-gray-900 font-medium min-w-0 break-words">{children}</span>
  </div>
)
