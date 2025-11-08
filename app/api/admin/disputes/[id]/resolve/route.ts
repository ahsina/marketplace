import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { resolveDisputeSchema } from '@/lib/validations/dispute'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/disputes/[id]/resolve - Resolve a dispute
 */
async function resolveDisputeHandler(
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

    const [data, validationError] = await validate(request, resolveDisputeSchema)
    if (validationError) return validationError

    const { outcome, resolution, refundAmount } = data

    // Get dispute with order details
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: true
      }
    })

    if (!dispute) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Dispute not found' },
        { status: 404 }
      )
    }

    // Start a transaction to handle dispute resolution and any refunds
    const result = await prisma.$transaction(async (tx) => {
      // Update dispute status
      const resolvedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          outcome,
          resolution,
          resolvedAt: new Date(),
          resolvedBy: admin.userId
        },
        include: {
          order: {
            include: {
              product: { select: { title: true } },
              buyer: { select: { username: true, email: true } },
              seller: { select: { username: true, email: true } }
            }
          }
        }
      })

      // Handle refunds based on outcome
      if (
        outcome === 'BUYER_FAVOR' ||
        outcome === 'FULL_REFUND' ||
        outcome === 'PARTIAL_REFUND'
      ) {
        let refundAmountFinal = refundAmount

        if (outcome === 'FULL_REFUND') {
          refundAmountFinal = dispute.order.totalAmount
        }

        if (!refundAmountFinal || refundAmountFinal <= 0) {
          throw new Error('Refund amount must be specified for refund outcomes')
        }

        // Create or update refund record
        const existingRefund = await tx.refund.findFirst({
          where: { orderId: dispute.orderId }
        })

        if (existingRefund) {
          await tx.refund.update({
            where: { id: existingRefund.id },
            data: {
              status: 'APPROVED',
              sellerResponse: `Dispute resolved in buyer's favor: ${resolution}`,
              refundAmount: refundAmountFinal,
              processedAt: new Date()
            }
          })
        } else {
          await tx.refund.create({
            data: {
              orderId: dispute.orderId,
              buyerId: dispute.buyerId,
              sellerId: dispute.sellerId,
              reason: `Dispute resolved: ${dispute.reason}`,
              status: 'APPROVED',
              sellerResponse: `Dispute resolved in buyer's favor: ${resolution}`,
              refundAmount: refundAmountFinal,
              processedAt: new Date()
            }
          })
        }

        // Update order status
        await tx.order.update({
          where: { id: dispute.orderId },
          data: { status: 'REFUNDED' }
        })
      }

      // If outcome is in seller's favor, update order to completed if it's not already
      if (outcome === 'SELLER_FAVOR' || outcome === 'NO_REFUND') {
        if (dispute.order.status !== 'COMPLETED') {
          await tx.order.update({
            where: { id: dispute.orderId },
            data: { status: 'COMPLETED', completedAt: new Date() }
          })
        }
      }

      return resolvedDispute
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: result,
        message: 'Dispute resolved successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resolve dispute error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(resolveDisputeHandler)
