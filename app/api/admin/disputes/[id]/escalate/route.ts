import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { escalateDisputeSchema } from '@/lib/validations/dispute'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/disputes/[id]/escalate - Escalate a dispute
 */
async function escalateDisputeHandler(
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

    const [data, validationError] = await validate(request, escalateDisputeSchema)
    if (validationError) return validationError

    const { reason } = data

    // Update dispute status
    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'ESCALATED'
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

    // Add internal note about escalation
    await prisma.disputeMessage.create({
      data: {
        disputeId,
        senderId: admin.userId,
        message: `Dispute escalated: ${reason}`,
        isInternal: true
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: dispute,
        message: 'Dispute escalated successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Escalate dispute error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(escalateDisputeHandler)
