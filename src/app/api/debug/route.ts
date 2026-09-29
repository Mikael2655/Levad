export const dynamic = 'force-dynamic'

export async function GET() {
  const vars = Object.keys(process.env)
    .filter(k => k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('PG'))
    .reduce((acc, k) => {
      const val = process.env[k] || ''
      acc[k] = val.length > 0 ? val.substring(0, 30) + '...' : '(empty)'
      return acc
    }, {} as Record<string, string>)

  return Response.json(vars)
}
