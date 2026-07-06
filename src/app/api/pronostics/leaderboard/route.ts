import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/scoring'

export async function GET() {
  const leaderboard = await getLeaderboard()
  return NextResponse.json(leaderboard)
}
