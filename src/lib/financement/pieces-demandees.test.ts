import { describe, expect, it, vi } from 'vitest'
import { extrairePiecesDemandees, lignesPiecesDemandees, typeDeLigne } from './pieces-demandees'

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

  it('retire l’introduction « P.S. : » des lignes, à l’extraction comme à l’affichage', () => {
    expect(extrairePiecesDemandees('P.S. : merci de nous faire parvenir le bilan et compte de résultat 2025').lignes).toEqual(['Merci de nous faire parvenir le bilan et compte de résultat 2025'])
    expect(lignesPiecesDemandees('• P.S. : le bilan 2025\n• PS - un RIB\n• Post-scriptum : les statuts\n• Le P.S. du dossier')).toEqual(['le bilan 2025', 'un RIB', 'les statuts', 'Le P.S. du dossier'])
    expect(lignesPiecesDemandees(null)).toEqual([])
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

describe('document reçu d’un financeur : accord, refus ou pièces', () => {
  it('reconnaît un accord et en sort les montants (financé en tête, loyer repéré)', async () => {
    const { typeDeDocument, extraireMontants } = await import('./pieces-demandees')
    const texte = 'SOLUBAIL\nNous avons le plaisir de vous confirmer notre accord de financement pour ACME.\nMontant financé : 10 234,50 €\nLoyer trimestriel : 1 012,00 €\nDurée : 48 mois'
    expect(typeDeDocument(texte, 0)).toBe('ACCORD')
    const m = extraireMontants(texte)
    expect(m[0]).toMatchObject({ valeurCentimes: 1023450, etiquette: 'FINANCE' })
    expect(m.find(x => x.etiquette === 'LOYER')?.valeurCentimes).toBe(101200)
  })
  it('refus, pièces, et cas ambigus (accord sous réserve de pièces) laissés au choix de l’utilisateur', async () => {
    const { typeDeDocument } = await import('./pieces-demandees')
    expect(typeDeDocument('Nous ne pouvons donner suite : dossier refusé.', 0)).toBe('REFUS')
    expect(typeDeDocument('Merci de nous transmettre le Kbis et le dernier bilan.', 2)).toBe('PIECES')
    expect(typeDeDocument('Bonjour, voici un message sans objet clair.', 0)).toBe('INCONNU')
    expect(typeDeDocument('Accord de financement sous réserve, mais le dossier est refusé par ailleurs', 0)).toBe('INCONNU')
  })
  it('montants : séparateurs de milliers, centimes absents, doublons ignorés', async () => {
    const { extraireMontants } = await import('./pieces-demandees')
    const m = extraireMontants('Capital 4.780,88 euros\nPrix d’achat 12 000 €\nCapital 4.780,88 euros')
    expect(m.map(x => x.valeurCentimes).sort((a, b) => a - b)).toEqual([478088, 1200000])
  })
})

describe('exemple réel d’accord de financement (PDF reçu)', () => {
  const ACCORD = `le 27/07/2026
ACCORD N° 75815IB
COMMERCIAL : CONFRERES APPORTEUR :DFM
Client : CEFIC REAL ESTATE MANAGEMENT Siren : 752975433
Matériel : Bureautique
PLAN DE FINANCEMENT
Montant du financement : 9 639,50 €
Durée du financement : 63 mois
Nombre de loyers : 21
Terme : Terme à échoir
Coefficient : 6,3800
Loyers : 615,00 €
Location financière en trimestre(s) - Règlement par prélèvement automatique
Autres conditions :
CONDITIONS SOUS RESERVE DE LA QUALITE DU CLIENT, DE LA DATE D'INSTALLATION ET DU CALAGE
LEVAD
* Les conditions de cet accord sont valables 3 mois à compter de la date de l'accord`
  it('type, montants, informations et contrôle de cohérence avec la demande', async () => {
    const { typeDeDocument, extraireMontants, extraireInfosAccord, controlerAccord, extrairePiecesDemandees: ex } = await import('./pieces-demandees')
    expect(typeDeDocument(ACCORD, ex(ACCORD).lignes.length)).toBe('ACCORD')
    const m = extraireMontants(ACCORD)
    expect(m[0]).toMatchObject({ valeurCentimes: 963950, etiquette: 'FINANCE' })
    const infos = extraireInfosAccord(ACCORD, m)
    expect(infos).toEqual({ numero: '75815IB', siren: '752975433', dureeMois: 63, loyerCentimes: 61500, coefficient: 6.38 })
    expect(controlerAccord(infos, { siret: '75297543300012', loyerCentimes: 61500, dureeMois: 63 })).toEqual({ siren: 'ok', loyer: 'ok', duree: 'ok' })
    expect(controlerAccord(infos, { siret: '35600000000048', loyerCentimes: 60000, dureeMois: 48 })).toEqual({ siren: 'different', loyer: 'different', duree: 'different' })
    expect(controlerAccord(infos, { siret: '', loyerCentimes: 61500, dureeMois: 63 }).siren).toBe('absent')
  })
})
