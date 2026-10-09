import type { Metadata } from 'next'
import { iconesConnect } from '@/lib/connect/metadata'

// Page de téléchargement générique du programme Levad Connect (relevé des copieurs chez les clients).
// Les fichiers sont déposés automatiquement dans public/telechargements/ par la fabrication GitHub
// (voir .github/workflows/build-releve-snmp.yml).

export const metadata: Metadata = {
  title: 'Levad Connect — Télécharger',
  description: 'Programme de relevé des copieurs LEVAD',
  robots: { index: false, follow: false },
  icons: iconesConnect,
}

import { PageTelechargement } from '@/components/connect/PageTelechargement'

export default function TelechargerPage() {
  return <PageTelechargement />
}
