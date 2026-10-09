'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

// Formulaire du tableau de bord qui confirme à l'écran que l'action a bien été prise en compte :
// le bouton se grise pendant l'enregistrement (impossible de cliquer deux fois), puis un message vert s'affiche.
type Action = (formData: FormData) => Promise<void | string>

export function Bouton({ children, className = '', style, disabled }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button disabled={pending || disabled} style={style} className={`${className} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? 'En cours…' : children}
    </button>
  )
}

export function Formulaire({
  action,
  message = 'Enregistré',
  reinitialiser = false,
  className,
  children,
}: {
  action: Action
  message?: string
  reinitialiser?: boolean
  className?: string
  children: React.ReactNode
}) {
  const [retour, setRetour] = useState<{ texte: string; erreur: boolean } | null>(null)
  const ref = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={ref}
      className={className}
      action={async (fd) => {
        setRetour(null)
        try {
          const r = await action(fd)
          const erreur = typeof r === 'string' && r.startsWith('!')
          setRetour({ texte: typeof r === 'string' ? r.replace(/^!/, '') : message, erreur })
          if (!erreur && reinitialiser) ref.current?.reset()
        } catch (e) {
          // une redirection serveur n'est pas une erreur : la page change toute seule
          if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e
          setRetour({ texte: 'Échec de l’enregistrement, réessayez', erreur: true })
        }
      }}
    >
      {children}
      {retour && (
        <p role="status" className={`mt-2 text-sm font-semibold ${retour.erreur ? 'text-red-600' : 'text-green-700'}`}>
          {retour.erreur ? '✕ ' : '✓ '}
          {retour.texte}
        </p>
      )}
    </form>
  )
}
