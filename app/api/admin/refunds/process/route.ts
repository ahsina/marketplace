import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { processAllPendingRefunds } from '@/lib/refund-automation'
import { withCsrf } from '@/lib/with-csrf'

/**
 * POST /api/admin/refunds/process - Process all pending refunds automatically
 */
async function processRefundsHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Run automated refund processing
    const results = await processAllPendingRefunds()

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: results,
        message: `Processed ${results.total} refunds: ${results.approved} approved, ${results.rejected} rejected, ${results.review} sent to manual review`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Process refunds error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(processRefundsHandler)
