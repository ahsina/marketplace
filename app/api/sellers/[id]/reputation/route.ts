import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'
import { calculateSellerReputation } from '@/lib/reputation'

/**
 * GET /api/sellers/[id]/reputation - Get seller reputation score
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sellerId } = await params

    const reputation = await calculateSellerReputation(sellerId)

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: reputation
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get seller reputation error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
