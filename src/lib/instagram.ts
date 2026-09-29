// Instagram Graph API — nécessite un compte Instagram Business lié à une Page Facebook
export async function publishToInstagram(caption: string, accessToken: string, igAccountId: string, imageUrl?: string): Promise<string> {
  const base = `https://graph.facebook.com/v19.0/${igAccountId}`

  const imageSource = imageUrl ?? process.env.INSTAGRAM_DEFAULT_IMAGE_URL
  if (!imageSource) throw new Error('Instagram nécessite une image. Définissez INSTAGRAM_DEFAULT_IMAGE_URL.')

  // 1. Créer le container média
  const containerRes = await fetch(`${base}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caption, image_url: imageSource, media_type: 'IMAGE', access_token: accessToken }),
  })
  if (!containerRes.ok) throw new Error(`Instagram container ${containerRes.status}: ${await containerRes.text()}`)
  const { id: creationId } = await containerRes.json()

  // 2. Publier le container
  const publishRes = await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  })
  if (!publishRes.ok) throw new Error(`Instagram publish ${publishRes.status}: ${await publishRes.text()}`)
  const { id } = await publishRes.json()
  return id as string
}
