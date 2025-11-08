import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'
import { getTopSellers } from '@/lib/reputation'

/**
 * GET /api/sellers/top - Get top-ranked sellers by reputation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const topSellers = await getTopSellers(Math.min(limit, 50)) // Cap at 50

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: topSellers
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get top sellers error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
