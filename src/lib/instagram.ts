// Instagram Graph API — requires an Instagram Business account linked to a Facebook Page
// INSTAGRAM_ACCESS_TOKEN: long-lived Page access token
// INSTAGRAM_ACCOUNT_ID: Instagram Business Account ID

export async function publishToInstagram(caption: string, accessToken: string, igAccountId: string, imageUrl?: string): Promise<string> {
  const baseUrl = `https://graph.facebook.com/v19.0/${igAccountId}`

  // Step 1: create media container
  const containerParams: Record<string, string> = {
    caption,
    access_token: accessToken,
  }

  if (imageUrl) {
    containerParams.image_url = imageUrl
    containerParams.media_type = 'IMAGE'
  } else {
    // Instagram requires an image — use a default branded image URL if none provided
    const defaultImage = process.env.INSTAGRAM_DEFAULT_IMAGE_URL
    if (!defaultImage) throw new Error('Instagram requires an image. Set INSTAGRAM_DEFAULT_IMAGE_URL or provide imageUrl.')
    containerParams.image_url = defaultImage
    containerParams.media_type = 'IMAGE'
  }

  const containerRes = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerParams),
  })

  if (!containerRes.ok) {
    const err = await containerRes.text()
    throw new Error(`Instagram container error: ${containerRes.status} - ${err}`)
  }

  const { id: creationId } = await containerRes.json()

  // Step 2: publish the container
  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  })

  if (!publishRes.ok) {
    const err = await publishRes.text()
    throw new Error(`Instagram publish error: ${publishRes.status} - ${err}`)
  }

  const { id } = await publishRes.json()
  return id as string
}
