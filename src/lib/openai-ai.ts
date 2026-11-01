import OpenAI from 'openai'
import { buildRewritePrompt, parseRewrite, type RewriteInput } from '@/lib/claude-ai'

// Reformulation avec ChatGPT (API OpenAI, facturée à l'usage). Modèle réglable par OPENAI_TEXT_MODEL.
export async function rewriteWithChatGPT(input: RewriteInput): Promise<{ linkedin: string; instagram: string }> {
  if (!process.env.OPENAI_API_KEY) throw new Error('Clé OpenAI absente (variable OPENAI_API_KEY)')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 1 })
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1'

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Tu es un copywriter B2B francophone. Tu réponds uniquement avec un objet JSON valide.' },
        { role: 'user', content: buildRewritePrompt(input) },
      ],
    })
    return parseRewrite(completion.choices[0]?.message?.content ?? '')
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 401) throw new Error('Clé OpenAI refusée (OPENAI_API_KEY invalide ou expirée)')
    if (status === 404) throw new Error(`Modèle OpenAI « ${model} » introuvable : définissez OPENAI_TEXT_MODEL`)
    if (status === 429) throw new Error('OpenAI : quota ou solde épuisé (vérifiez Billing sur platform.openai.com)')
    throw e
  }
}
