import { describe, expect, it, vi } from 'vitest'
import { extrairePiecesDemandees, typeDeLigne } from './pieces-demandees'

vi.mock('@/lib/db', () => ({ prisma: {} }))

const MAIL = `GRENKE Location - Dossier 100-145711
Bonjour, nous avons bien reçu la demande de financement pour SOCIETE CIVILE DE MOYENS D'AVOCATS CKE AVOCATS.
Afin de finaliser l'étude de votre dossier, merci de nous faire parvenir les documents suivants :
Un extrait K-bis de moins de 3 mois
Les 2 derniers bilans complets avec liasse fiscale
Un RIB au nom de la société
La pièce d'identité recto verso du gérant
Les statuts à jour
Cordialement, le service Études.`

describe('extraction des pièces demandées', () => {
  it('retrouve les pièces d’un e-mail type, avec leur précision, sans reprendre le reste du texte', () => {
    const r = extrairePiecesDemandees(MAIL)
    expect(r.lignes).toEqual([
      'Un extrait K-bis de moins de 3 mois',
      'Les 2 derniers bilans complets avec liasse fiscale',
      'Un RIB au nom de la société',
      "La pièce d'identité recto verso du gérant",
      'Les statuts à jour',
    ])
    expect(r.types.sort()).toEqual(['AUTRE', 'BILAN', 'KBIS', 'RIB'])
  })

  it('puces, majuscules, accents et variantes (Kbis, K bis, bilans, IBAN, avis d’imposition)', () => {
    const r = extrairePiecesDemandees('• KBIS de moins de 3 mois\n• 3 derniers BILANS\n• IBAN / relevé d’identité bancaire\n- Dernier avis d’imposition du dirigeant\n- Relevés bancaires des 3 derniers mois')
    expect(r.lignes).toEqual([
      'KBIS de moins de 3 mois', '3 derniers BILANS', 'IBAN / relevé d’identité bancaire', 'Dernier avis d’imposition du dirigeant', 'Relevés bancaires des 3 derniers mois',
    ])
  })

  it('texte sans pièce connue : liste vide (l’utilisateur saisit à la main)', () => {
    expect(extrairePiecesDemandees('Bonjour, votre dossier est en cours d’étude. Cordialement.').lignes).toEqual([])
  })

  it('type de pièce jointe correspondant à une ligne (pour cocher ce qui est déposé)', () => {
    expect(typeDeLigne('Un extrait K-bis de moins de 3 mois')).toBe('KBIS')
    expect(typeDeLigne('Les 2 derniers bilans')).toBe('BILAN')
    expect(typeDeLigne('Un RIB')).toBe('RIB')
    expect(typeDeLigne('Les statuts à jour')).toBe('AUTRE')
  })
})

describe('lecture d’un PDF', () => {
  // PDF minimal écrit à la main (une page, un texte) : suffit à vérifier que la lecture fonctionne dans l'environnement de l'application.
  const pdf = (lignes: string[]) => {
    const flux = `BT /F1 12 Tf 50 750 Td 14 TL ${lignes.map(l => `(${l}) Tj T*`).join(' ')} ET`
    const objets = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    let out = '%PDF-1.4\n'; const pos: number[] = []
    objets.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
    const xref = out.length
    out += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
    return Buffer.from(out, 'latin1')
  }
  it('extrait les pièces d’un PDF, refuse un fichier qui n’est pas un PDF ou trop gros', async () => {
    const { analyserPdfPiecesDemandees } = await import('./pieces-demandees')
    const admin = { id: 1, role: 'ADMIN' as const }
    const r = await analyserPdfPiecesDemandees(admin, pdf(['Merci de nous faire parvenir les documents suivants :', 'Un extrait Kbis de moins de 3 mois', 'Les 3 derniers bilans', 'Un RIB']))
    expect(r.texteLu).toBe(true)
    expect(r.lignes).toEqual(['Un extrait Kbis de moins de 3 mois', 'Les 3 derniers bilans', 'Un RIB'])
    await expect(analyserPdfPiecesDemandees(admin, Buffer.from('pas un pdf du tout'))).rejects.toThrow(/pas un PDF/)
    await expect(analyserPdfPiecesDemandees({ id: 2, role: 'COMMERCIAL' }, pdf(['x']))).rejects.toMatchObject({ status: 403 })
  })
})
