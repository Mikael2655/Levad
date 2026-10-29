// Téléchargement du programme Linux (sans fenêtre) pour un client : le même fichier pour tous, mais son NOM contient le
// code du client (Levad-Connect-<code>), que le programme lit à l'installation. Lien réservé à la fiche du client (pas dans le mail).
// Exécuté sur le réseau « edge » : la réponse est diffusée en flux.

export const runtime = 'edge'

const MOTIF_CODE = /^[a-hj-km-np-z2-9]{16}$/

export async function GET(req: Request, { params }: { params: { code: string } }) {
  if (!MOTIF_CODE.test(params.code)) return new Response('Introuvable', { status: 404 })
  const source = await fetch(new URL('/telechargements/Levad-Connect-Linux', req.url))
  if (!source.ok || !source.body) return new Response('Programme indisponible', { status: 502 })
  return new Response(source.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="Levad-Connect-${params.code}"`,
      'Cache-Control': 'no-store',
    },
  })
}
