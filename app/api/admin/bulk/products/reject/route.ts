import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkRejectProductsSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/products/reject - Bulk reject products
 */
async function bulkRejectProductsHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkRejectProductsSchema)
    if (validationError) return validationError

    const { productIds, reason } = data

    // Use transaction to update both products and approvals
    const result = await prisma.$transaction(async (tx) => {
      // Update product approvals
      const approvalResult = await tx.productApproval.updateMany({
        where: {
          productId: { in: productIds },
          status: 'PENDING'
        },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedBy: admin.userId,
          reviewedAt: new Date()
        }
      })

      // Deactivate rejected products
      const productResult = await tx.product.updateMany({
        where: {
          id: { in: productIds }
        },
        data: {
          isActive: false
        }
      })

      return {
        approvals: approvalResult.count,
        products: productResult.count
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: result,
        message: `Successfully rejected ${result.approvals} product(s)`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk reject products error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkRejectProductsHandler)
