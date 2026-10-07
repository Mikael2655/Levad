import SessionGuard from './SessionGuard'

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionGuard />
      {children}
    </>
  )
}
