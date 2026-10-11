import SessionGuard from './SessionGuard'
import { appMetadata, appViewport } from '@/lib/app-metadata'

export const metadata = appMetadata
export const viewport = appViewport

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionGuard />
      {children}
    </>
  )
}
