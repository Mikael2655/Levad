async function getPersonSub(accessToken: string): Promise<string> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`LinkedIn userinfo ${res.status}`)
  const data = await res.json()
  return data.sub as string
}

export async function publishToLinkedIn(content: string, accessToken: string): Promise<string> {
  const sub = await getPersonSub(accessToken)
  const author = `urn:li:person:${sub}`

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      visibility: 'PUBLIC',
      commentary: content,
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
    }),
  })

  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${await res.text()}`)
  const location = res.headers.get('x-restli-id') ?? res.headers.get('location') ?? ''
  return location
}
