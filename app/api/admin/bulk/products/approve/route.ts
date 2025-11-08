import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkApproveProductsSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/products/approve - Bulk approve products
 */
async function bulkApproveProductsHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkApproveProductsSchema)
    if (validationError) return validationError

    const { productIds } = data

    // Use transaction to update both products and approvals
    const result = await prisma.$transaction(async (tx) => {
      // Update product approvals
      const approvalResult = await tx.productApproval.updateMany({
        where: {
          productId: { in: productIds },
          status: 'PENDING'
        },
        data: {
          status: 'APPROVED',
          reviewedBy: admin.userId,
          reviewedAt: new Date()
        }
      })

      // Activate approved products
      const productResult = await tx.product.updateMany({
        where: {
          id: { in: productIds }
        },
        data: {
          isActive: true
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
        message: `Successfully approved ${result.approvals} product(s)`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk approve products error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkApproveProductsHandler)
