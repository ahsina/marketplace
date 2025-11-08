import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { addEvidenceSchema } from '@/lib/validations/dispute'
import { withCsrfAndRateLimit } from '@/lib/with-csrf'
import { RateLimits } from '@/lib/rate-limit'
import { ApiResponse } from '@/types'

/**
 * POST /api/disputes/[id]/evidence - Add evidence to a dispute
 */
async function addEvidenceHandler(
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

    const [data, validationError] = await validate(request, addEvidenceSchema)
    if (validationError) return validationError

    const { evidence } = data

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

    // Determine which evidence field to update
    let updateData: any = {}

    if (user.userId === dispute.buyerId) {
      const existingEvidence = dispute.buyerEvidence
        ? JSON.parse(dispute.buyerEvidence)
        : []
      updateData.buyerEvidence = JSON.stringify([...existingEvidence, ...evidence])
    } else if (user.userId === dispute.sellerId) {
      const existingEvidence = dispute.sellerEvidence
        ? JSON.parse(dispute.sellerEvidence)
        : []
      updateData.sellerEvidence = JSON.stringify([...existingEvidence, ...evidence])
    } else {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You do not have access to this dispute' },
        { status: 403 }
      )
    }

    // Update dispute with new evidence
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: updateData
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          buyerEvidence: updatedDispute.buyerEvidence
            ? JSON.parse(updatedDispute.buyerEvidence)
            : null,
          sellerEvidence: updatedDispute.sellerEvidence
            ? JSON.parse(updatedDispute.sellerEvidence)
            : null
        },
        message: 'Evidence added successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Add evidence error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfAndRateLimit(
  { limit: RateLimits.API.limit, window: RateLimits.API.window, namespace: 'dispute-evidence' },
  addEvidenceHandler
)
