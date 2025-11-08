import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getSellerDashboard } from '@/lib/analytics'
import { ApiResponse } from '@/types'

/**
 * GET /api/analytics/seller - Get seller-specific analytics
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId') || user.userId
    const period = searchParams.get('period') || '30d'

    // Only allow users to view their own analytics unless admin
    if (sellerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You can only view your own analytics' },
        { status: 403 }
      )
    }

    // Calculate date range
    const end = new Date()
    const start = new Date()

    switch (period) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
      case '1y':
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        start.setDate(start.getDate() - 30)
    }

    const analytics = await getSellerDashboard(sellerId, { startDate: start, endDate: end })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          ...analytics,
          period: { startDate: start, endDate: end }
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get seller analytics error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
