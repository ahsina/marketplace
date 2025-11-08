import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDashboardSummary } from '@/lib/analytics'
import { ApiResponse } from '@/types'

/**
 * GET /api/analytics/dashboard - Get comprehensive dashboard analytics (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y

    let start: Date
    let end: Date = new Date()

    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      // Calculate based on period
      start = new Date()
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
    }

    const analytics = await getDashboardSummary({ startDate: start, endDate: end })

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
    console.error('Get dashboard analytics error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
