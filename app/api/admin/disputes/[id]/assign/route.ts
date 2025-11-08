import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { assignDisputeSchema } from '@/lib/validations/dispute'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/disputes/[id]/assign - Assign dispute to admin
 */
async function assignDisputeHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { id: disputeId } = await params

    const [data, validationError] = await validate(request, assignDisputeSchema)
    if (validationError) return validationError

    const { assignedTo } = data

    // Verify assignedTo user is an admin
    const targetAdmin = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { role: true }
    })

    if (!targetAdmin || targetAdmin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Target user must be an admin' },
        { status: 400 }
      )
    }

    // Update dispute
    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        assignedTo,
        assignedAt: new Date(),
        status: 'IN_REVIEW'
      },
      include: {
        order: {
          include: {
            product: { select: { title: true } },
            buyer: { select: { username: true } },
            seller: { select: { username: true } }
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: dispute,
        message: 'Dispute assigned successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Assign dispute error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(assignDisputeHandler)
