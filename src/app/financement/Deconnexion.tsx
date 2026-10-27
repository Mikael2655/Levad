'use client'

export default function Deconnexion() {
  return (
    <button
      className="text-gray-600 hover:text-gray-900"
      onClick={async () => {
        await fetch('/api/financement/deconnexion', { method: 'POST' })
        window.location.href = '/financement/connexion'
      }}
    >
      Déconnexion
    </button>
  )
}
