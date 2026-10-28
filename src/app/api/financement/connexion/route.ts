import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { HASH_FACTICE, verifier } from '@/lib/financement/motdepasse'
import { SESSION_FIN_COOKIE, creerJeton, optionsCookieFin, secretConfigure } from '@/lib/financement/session'

export async function POST(req: Request) {
  if (!secretConfigure()) {
    return NextResponse.json({ error: 'Configuration incomplète : la variable AUTH_SECRET est absente de cet environnement Vercel (ajoutez-la puis relancez le déploiement).' }, { status: 503 })
  }
  try {
    return await connecter(req)
  } catch (e) {
    console.error('Connexion : erreur serveur', e)
    return NextResponse.json({ error: 'Erreur du serveur pendant la connexion (voir les journaux Vercel).' }, { status: 500 })
  }
}

async function connecter(req: Request) {
  const corps = await req.json().catch(() => ({}))
  const email = String(corps.email ?? '').trim().toLowerCase()
  const motDePasse = String(corps.motDePasse ?? '')
  const u = email ? await prisma.finUtilisateur.findUnique({ where: { email } }) : null
  // Toujours une comparaison bcrypt, même si l'adresse n'existe pas : même durée de réponse.
  const ok = await verifier(motDePasse, u?.motDePasseHash ?? HASH_FACTICE)
  if (!u || !u.actif || !ok) return NextResponse.json({ error: 'Adresse ou mot de passe incorrect.' }, { status: 401 })
  const res = NextResponse.json({ ok: true, doitChangerMotDePasse: u.doitChangerMotDePasse })
  res.cookies.set(SESSION_FIN_COOKIE, await creerJeton(u.id), optionsCookieFin)
  return res
}
