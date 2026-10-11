import { publishToLinkedIn } from '@/lib/linkedin'
import { publishToInstagram } from '@/lib/instagram'

export async function publishEverywhere(
  post: { contentLI: string | null; contentIG: string | null },
  config: { linkedinEnabled: boolean; instagramEnabled: boolean },
  imageUrl?: string | null,
) {
  const errors: string[] = []
  let linkedinPostId: string | undefined
  let instagramPostId: string | undefined

  if (config.linkedinEnabled && post.contentLI) {
    const token = process.env.LINKEDIN_ACCESS_TOKEN
    if (!token) {
      errors.push('LinkedIn non configuré (LINKEDIN_ACCESS_TOKEN manquant)')
    } else {
      try {
        linkedinPostId = await publishToLinkedIn(post.contentLI, token, imageUrl ?? undefined)
      } catch (e) {
        errors.push(`LinkedIn: ${String(e)}`)
      }
    }
  }

  if (config.instagramEnabled && post.contentIG) {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN
    const accountId = process.env.INSTAGRAM_ACCOUNT_ID
    if (!token || !accountId) {
      errors.push('Instagram non configuré (INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_ACCOUNT_ID manquants)')
    } else {
      try {
        instagramPostId = await publishToInstagram(post.contentIG, token, accountId)
      } catch (e) {
        errors.push(`Instagram: ${String(e)}`)
      }
    }
  }

  return { published: !!(linkedinPostId || instagramPostId), linkedinPostId, instagramPostId, errors }
}
