export async function publishToLinkedIn(content: string, accessToken: string, personUrn: string): Promise<string> {
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202501',
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      commentary: content,
    }),
  })

  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${await res.text()}`)
  const location = res.headers.get('x-restli-id') || res.headers.get('location') || 'published'
  return location
}
