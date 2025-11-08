import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

/**
 * GET /api/disputes/[id] - Get dispute details
 */
export async function GET(
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

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            product: true,
            buyer: { select: { id: true, username: true, email: true } },
            seller: { select: { id: true, username: true, email: true } }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          where: user.role === 'ADMIN' ? {} : { isInternal: false } // Hide internal notes from users
        }
      }
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

    // Parse JSON fields
    const disputeData = {
      ...dispute,
      buyerEvidence: dispute.buyerEvidence ? JSON.parse(dispute.buyerEvidence) : null,
      sellerEvidence: dispute.sellerEvidence ? JSON.parse(dispute.sellerEvidence) : null,
      messages: dispute.messages.map(msg => ({
        ...msg,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : null
      }))
    }

    return NextResponse.json<ApiResponse>(
      { success: true, data: disputeData },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get dispute details error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
