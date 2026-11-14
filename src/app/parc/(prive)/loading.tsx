// Affiché aussitôt qu'on clique sur un menu, pendant que la page se prépare : le clic est pris en compte tout de suite.
export default function Chargement() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-56 rounded-lg bg-gray-200" />
      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="h-24 rounded-xl bg-gray-200" />
        <div className="h-24 rounded-xl bg-gray-200" />
        <div className="h-24 rounded-xl bg-gray-200" />
      </div>
      <div className="mt-6 h-64 rounded-xl bg-gray-200" />
    </div>
  )
}
