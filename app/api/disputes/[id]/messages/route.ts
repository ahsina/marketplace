import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { addDisputeMessageSchema } from '@/lib/validations/dispute'
import { withCsrfAndRateLimit } from '@/lib/with-csrf'
import { RateLimits } from '@/lib/rate-limit'
import { ApiResponse } from '@/types'

/**
 * POST /api/disputes/[id]/messages - Add a message to a dispute
 */
async function addDisputeMessageHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: disputeId } = await params

    const [data, validationError] = await validate(request, addDisputeMessageSchema)
    if (validationError) return validationError

    const { message, attachments, isInternal } = data

    // Get dispute details
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId }
    })

    if (!dispute) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Dispute not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this dispute
    const hasAccess =
      user.role === 'ADMIN' ||
      dispute.buyerId === user.userId ||
      dispute.sellerId === user.userId

    if (!hasAccess) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You do not have access to this dispute' },
        { status: 403 }
      )
    }

    // Only admins can create internal notes
    const isInternalNote = isInternal && user.role === 'ADMIN'

    // Create the message
    const disputeMessage = await prisma.disputeMessage.create({
      data: {
        disputeId,
        senderId: user.userId,
        message,
        attachments: attachments ? JSON.stringify(attachments) : null,
        isInternal: isInternalNote
      }
    })

    // Update dispute status if needed
    if (!isInternalNote) {
      let newStatus = dispute.status
      if (user.userId === dispute.buyerId && dispute.status === 'AWAITING_RESPONSE') {
        newStatus = 'IN_REVIEW'
      } else if (user.userId === dispute.sellerId && dispute.status === 'OPEN') {
        newStatus = 'AWAITING_RESPONSE'
      }

      if (newStatus !== dispute.status) {
        await prisma.dispute.update({
          where: { id: disputeId },
          data: { status: newStatus }
        })
      }
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          ...disputeMessage,
          attachments: disputeMessage.attachments
            ? JSON.parse(disputeMessage.attachments)
            : null
        },
        message: 'Message added successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add dispute message error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfAndRateLimit(
  { limit: RateLimits.API.limit, window: RateLimits.API.window, namespace: 'dispute-messages' },
  addDisputeMessageHandler
)
