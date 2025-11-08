import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkResolveReportsSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/reports/resolve - Bulk resolve reports
 */
async function bulkResolveReportsHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkResolveReportsSchema)
    if (validationError) return validationError

    const { reportIds, action, resolution } = data

    // Update reports
    const result = await prisma.contentReport.updateMany({
      where: {
        id: { in: reportIds },
        status: { in: ['PENDING', 'INVESTIGATING'] }
      },
      data: {
        status: action,
        resolution: resolution || `Bulk ${action.toLowerCase()} by admin`,
        resolvedAt: new Date(),
        assignedTo: admin.userId
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { count: result.count },
        message: `Successfully ${action.toLowerCase()} ${result.count} report(s)`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk resolve reports error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkResolveReportsHandler)
