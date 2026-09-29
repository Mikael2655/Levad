import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

export async function generateSocialPosts(params: GenerateParams): Promise<GeneratedContent> {
  const { topic, companyName, companyDesc, tone, targetAudience } = params

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
  "imagePrompt": "Description en anglais d'une image professionnelle pour illustrer ce post (style corporate moderne, photoréaliste)"
}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text) as GeneratedContent
}
