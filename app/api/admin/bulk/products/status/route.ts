import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkUpdateProductStatusSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/products/status - Bulk update product status
 */
async function bulkUpdateProductStatusHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkUpdateProductStatusSchema)
    if (validationError) return validationError

    const { productIds, isActive } = data

    // Update product status
    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds }
      },
      data: {
        isActive
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { count: result.count },
        message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${result.count} product(s)`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk update product status error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkUpdateProductStatusHandler)
