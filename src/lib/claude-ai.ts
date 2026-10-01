import Anthropic from '@anthropic-ai/sdk'

interface GenerateParams {
  topic: string
  companyName: string
  companyDesc: string
  tone: string
  targetAudience: string
}

export interface GeneratedContent {
  linkedin: string
  instagram: string
  imagePrompt: string
}

export async function selectTopic(recentTopics: string[], configTopics: string[]): Promise<{ topic: string; angle: string }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Tu es expert en marketing B2B pour une PME française spécialisée en téléphonie IP, impression, informatique et GED.

Thèmes récemment traités (à éviter si possible) : ${recentTopics.join(', ') || 'aucun'}
Thèmes configurés : ${configTopics.join(', ')}

Choisit le sujet le plus pertinent et actuel pour un post LinkedIn, en priorité sur :
- La réforme facture électronique obligatoire (2026-2027)
- La fin du RTC et la migration vers la téléphonie IP
- Cybersécurité PME (chiffres, obligations, RGPD)
- L'IA en entreprise et la productivité
- La dématérialisation et le zéro papier
- Les thèmes configurés s'ils sont opportuns

Réponds uniquement avec ce JSON (sans markdown) :
{"topic": "titre court du sujet", "angle": "angle précis et accrocheur pour PME française"}`
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
  try {
    return JSON.parse(text) as { topic: string; angle: string }
  } catch {
    return { topic: configTopics[Math.floor(Math.random() * configTopics.length)] ?? 'téléphonie IP', angle: '' }
  }
}

export async function generateSocialPosts(params: GenerateParams): Promise<GeneratedContent> {
  const { topic, companyName, companyDesc, tone, targetAudience } = params
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

Génère exactement ce JSON (sans markdown ni backticks):
{
  "linkedin": "Post LinkedIn professionnel de 150-200 mots, avec sauts de ligne, emojis pertinents, et 3-5 hashtags à la fin",
  "instagram": "Post Instagram de 100-150 mots, accrocheur, emojis, 8-10 hashtags",
  "imagePrompt": "Description en français d'une image pour illustrer ce post. Style: photographie réaliste prise en France, ambiance PME française authentique, éclairage naturel, pas trop parfait ni trop corporate. Éviter: décors américains, costumes trop impeccables, aspect trop lisse ou artificiel. Privilégier: bureau ou environnement de travail français ordinaire, personnes naturelles et crédibles, lumière douce et réaliste."
}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text) as GeneratedContent
}
