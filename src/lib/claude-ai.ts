import Anthropic from '@anthropic-ai/sdk'

interface GenerateParams {
  topic: string
  companyName: string
  companyDesc: string
  tone: string
  targetAudience: string
  context?: string
}

export interface GeneratedContent {
  linkedin: string
  instagram: string
  imagePrompt: string
}

function todayFr(): string {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON introuvable dans la réponse')
  return JSON.parse(match[0]) as T
}

export type PersonalKind = 'metier' | 'parcours'

export interface SelectedTopic {
  topic: string
  angle: string
  facts?: string
  personal?: PersonalKind
  hint?: string
}

export const NEWS_THEMES = [
  'la réforme de la facture électronique obligatoire',
  'la fin du RTC et la migration vers la téléphonie IP',
  'la cybersécurité des PME',
  "l'IA en entreprise et la productivité",
  'la dématérialisation et le zéro papier',
]

export async function selectTopic(recentTopics: string[], theme: string): Promise<SelectedTopic> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const today = todayFr()

  const prompt = `Tu es expert en marketing B2B pour une PME française spécialisée en téléphonie IP, impression, informatique et GED.

DATE DU JOUR : ${today}. Tout ce que tu écris doit être cohérent avec cette date : une échéance de l'année en cours ou d'une année passée n'est pas "à venir" sauf si sa date précise n'est pas encore passée. Raisonne en mois et en jours restants, pas en années.

Posts déjà écrits ou en attente (à ne pas répéter, ni le sujet ni l'angle) : ${recentTopics.join(' | ') || 'aucun'}

THÈME IMPOSÉ POUR CE POST : ${theme}
Ton sujet doit porter sur ce thème, pas sur un autre. Trouve l'actualité la plus récente et la plus intéressante liée à ce thème. Si ce thème a déjà été traité dans un post récent, prends un angle vraiment différent (autre cas d'usage, autre chiffre, autre secteur).

Rédige pour des dirigeants de PME françaises. Appuie-toi sur la recherche web pour trouver des informations récentes (derniers jours ou dernières semaines) et vérifier les échéances et chiffres avant de les citer.

Réponds uniquement avec ce JSON (sans markdown) :
{"topic": "titre court du sujet", "angle": "angle précis et accrocheur pour PME française", "facts": "3 à 5 faits ou chiffres vérifiés et datés (avec leur source), utiles pour rédiger le post"}`

  const fallback = (): SelectedTopic => ({
    topic: theme,
    angle: '',
  })

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
      messages: [{ role: 'user', content: prompt }],
    }, { timeout: 35000 })
    const text = msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('\n')
    return extractJson<SelectedTopic>(text)
  } catch (e) {
    console.error('selectTopic avec recherche web a échoué, repli sans recherche:', e)
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt.replace("Appuie-toi sur la recherche web pour trouver des informations récentes (derniers jours ou dernières semaines) et vérifier les échéances et chiffres avant de les citer.", "Tu n'as pas accès au web : ne cite que des faits dont tu es certain et reste prudent sur les chiffres récents.") }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return extractJson<SelectedTopic>(text)
  } catch {
    return fallback()
  }
}

export async function generateSocialPosts(params: GenerateParams): Promise<GeneratedContent> {
  const { topic, companyName, companyDesc, tone, targetAudience, context } = params
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Tu es un expert en marketing digital B2B. Génère du contenu pour les réseaux sociaux.

Entreprise: ${companyName}
Description: ${companyDesc}
Ton: ${tone}
Audience cible: ${targetAudience}
Sujet: ${topic}
Date du jour: ${todayFr()}
${context ? `Faits vérifiés à utiliser (ne rien inventer d'autre) :\n${context}\n` : ''}
Règles : le post doit être cohérent avec la date du jour. N'écris jamais une année passée ou en cours comme si elle était à venir, parle en mois ou en jours restants. Ne cite aucun chiffre ou date dont tu n'es pas certain.

Génère exactement ce JSON (sans markdown ni backticks):
{
  "linkedin": "Post LinkedIn professionnel de 150-200 mots, avec sauts de ligne, emojis pertinents, et 3-5 hashtags à la fin",
  "instagram": "Post Instagram de 100-150 mots, accrocheur, emojis, 8-10 hashtags",
  "imagePrompt": "Description en français d'une image pour illustrer ce post. Style: photographie réaliste prise en France, ambiance PME française authentique, éclairage naturel, pas trop parfait ni trop corporate. Éviter: décors américains, costumes trop impeccables, aspect trop lisse ou artificiel. Privilégier: bureau ou environnement de travail français ordinaire, personnes naturelles et crédibles, lumière douce et réaliste."
}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return extractJson<GeneratedContent>(text)
}

export async function generatePersonalPost(params: {
  kind: PersonalKind
  bio: string
  hint?: string
  companyName: string
  companyDesc: string
  tone: string
  recentPersonal: string[]
}): Promise<GeneratedContent & { topic: string }> {
  const { kind, bio, hint, companyName, companyDesc, tone, recentPersonal } = params
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const subject = kind === 'metier'
    ? "le métier : pourquoi le dirigeant a choisi de vendre des solutions d'impression, de téléphonie, d'informatique et de GED, ce qui lui plaît dans ce métier, ce qu'il veut apporter à ses clients, une conviction professionnelle"
    : "le parcours personnel : son histoire, ce qui l'anime, les étapes et les rencontres qui l'ont construit, ce en quoi il croit"

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    messages: [{
      role: 'user',
      content: `Tu écris un post LinkedIn et Instagram À LA PREMIÈRE PERSONNE (« je »), au nom du dirigeant de ${companyName}. Ce n'est pas un post d'entreprise : c'est lui qui parle.

Entreprise : ${companyName} — ${companyDesc}
Ton : ${tone}, mais humain et direct, comme quand il raconte les choses à un client qu'il apprécie.
Date du jour : ${todayFr()}

SUJET DE CE POST : ${subject}.
${hint ? `PRÉCISION DEMANDÉE PAR LE DIRIGEANT (à traiter en priorité) : ${hint}
` : ''}
MATIÈRE FOURNIE PAR LE DIRIGEANT (c'est la SEULE source de faits) :
"""
${bio}
"""

Posts personnels déjà écrits (ne pas répéter le même angle ni la même anecdote) : ${recentPersonal.join(' | ') || 'aucun'}

RÈGLES ABSOLUES :
- N'utilise QUE les éléments de la matière fournie. N'invente AUCUN fait, date, chiffre, nom, lieu, anecdote, citation ni émotion précise qui n'y figure pas. Si la matière est mince sur ce sujet, reste sur ce qui est dit, avec sincérité, sans broder.
- Choisis UN seul angle précis dans la matière (une anecdote, une conviction, un moment), pas un résumé de toute la vie.
- Style : phrases courtes, mots simples, concret. Pas de jargon d'entreprise, pas de formules creuses (« dans un monde en constante évolution », « passionné par l'innovation »…). Pas de leçon de morale.
- Première ligne : une accroche vraie qui donne envie de lire la suite.
- Termine par une phrase ouverte ou une question simple pour inviter à réagir.
- LinkedIn : 120 à 220 mots, sauts de ligne, au plus 1 emoji, 3 hashtags maximum à la fin. Instagram : 80 à 120 mots, 6 à 8 hashtags.

Réponds uniquement avec ce JSON (sans markdown) :
{"topic": "titre court et concret du post (max 90 caractères)", "linkedin": "...", "instagram": "...", "imagePrompt": "Description en français d'une photo réaliste, naturelle, prise en France, en lien avec le sujet (lieu de travail, objet, moment), sans visage reconnaissable imposé, lumière naturelle, pas trop lisse."}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return extractJson<GeneratedContent & { topic: string }>(text)
}
