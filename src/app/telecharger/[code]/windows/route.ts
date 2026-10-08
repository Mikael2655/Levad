// Téléchargement du programme résident pour un client : le même fichier pour tous, mais son NOM contient le
// code du client (Levad-Connect-<code>.exe). Au premier lancement, le programme lit son propre nom : il sait
// ainsi à quel client il appartient, sans que le client ait quoi que ce soit à saisir.
// Exécuté sur le réseau « edge » : la réponse est diffusée en flux, sans la limite de taille des fonctions classiques.

export const runtime = 'edge'

const MOTIF_CODE = /^[a-hj-km-np-z2-9]{16}$/

export async function GET(req: Request, { params }: { params: { code: string } }) {
  if (!MOTIF_CODE.test(params.code)) return new Response('Introuvable', { status: 404 })
  const source = await fetch(new URL('/telechargements/Levad-Connect.exe', req.url))
  if (!source.ok || !source.body) return new Response('Programme indisponible', { status: 502 })
  return new Response(source.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="Levad-Connect-${params.code}.exe"`,
      'Cache-Control': 'no-store',
    },
  })
}
