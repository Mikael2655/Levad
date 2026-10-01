async function getPersonSub(accessToken: string): Promise<string> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`LinkedIn userinfo ${res.status}`)
  const data = await res.json()
  return data.sub as string
}

async function uploadImageToLinkedIn(accessToken: string, author: string, imageUrl: string): Promise<string> {
  // Register upload
  const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: author,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  })
  if (!registerRes.ok) throw new Error(`LinkedIn register upload ${registerRes.status}: ${await registerRes.text()}`)
  const registerData = await registerRes.json()
  const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
  const assetUrn = registerData.value?.asset
  if (!uploadUrl || !assetUrn) throw new Error('LinkedIn register upload: missing uploadUrl or asset')

  // Fetch image bytes
  let imageBody: ArrayBuffer
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    imageBody = bytes.buffer
  } else {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`)
    imageBody = await imgRes.arrayBuffer()
  }

  // Upload image
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBody,
  })
  if (!uploadRes.ok && uploadRes.status !== 201) throw new Error(`LinkedIn image upload ${uploadRes.status}`)

  return assetUrn as string
}

export async function publishToLinkedIn(content: string, accessToken: string, imageUrl?: string): Promise<string> {
  const sub = await getPersonSub(accessToken)
  const author = `urn:li:person:${sub}`

  let assetUrn: string | undefined
  if (imageUrl) {
    try {
      assetUrn = await uploadImageToLinkedIn(accessToken, author, imageUrl)
    } catch (e) {
      console.error('Image upload failed, publishing without image:', e)
    }
  }

  const shareContent = assetUrn
    ? {
        shareCommentary: { text: content },
        shareMediaCategory: 'IMAGE',
        media: [{ status: 'READY', media: assetUrn, title: { text: 'Post Levad' } }],
      }
    : {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })

  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.id as string
}

export async function getTokenExpiry(accessToken: string): Promise<Date | null> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (clientId && clientSecret) {
    try {
      const res = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token: accessToken }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.active === false) return new Date(0)
        if (typeof data.expires_at === 'number') return new Date(data.expires_at * 1000)
      }
    } catch (e) {
      console.error('LinkedIn token introspection failed:', e)
    }
  }
  const fallback = process.env.LINKEDIN_TOKEN_EXPIRES_AT
  if (fallback) {
    const d = new Date(`${fallback}T23:59:59Z`)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}
