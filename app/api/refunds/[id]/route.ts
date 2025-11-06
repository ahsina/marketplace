import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Get a specific refund
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const refundId = params.id

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            product: {
              select: {
                title: true,
                price: true,
              },
            },
            buyer: {
              select: {
                username: true,
                email: true,
              },
            },
            seller: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    })

    if (!refund) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this refund
    if (refund.buyerId !== user.userId && refund.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: refund,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get refund error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update refund status (approve/reject by seller)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const refundId = params.id
    const body = await request.json()
    const { status, sellerResponse } = body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the refund
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            product: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (!refund) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      )
    }

    // Verify user is the seller
    if (refund.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only the seller can update refund status' },
        { status: 403 }
      )
    }

    // Check if refund is still pending
    if (refund.status !== 'PENDING') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'This refund has already been processed' },
        { status: 400 }
      )
    }

    // Update refund
    const updatedRefund = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status,
        sellerResponse: sellerResponse || null,
        processedAt: new Date(),
      },
    })

    // If approved, update order status to REFUNDED
    if (status === 'APPROVED') {
      await prisma.order.update({
        where: { id: refund.orderId },
        data: {
          status: 'REFUNDED',
        },
      })
    }

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: refund.buyerId,
        type: 'ORDER',
        title: status === 'APPROVED' ? 'Refund Approved' : 'Refund Rejected',
        message: `Your refund request for "${refund.order.product.title}" has been ${status.toLowerCase()}`,
        link: `/orders/${refund.orderId}`,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedRefund,
        message: `Refund ${status.toLowerCase()} successfully`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update refund error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete refund (cancel refund request)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const refundId = params.id

    // Get the refund
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    })

    if (!refund) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      )
    }

    // Verify user is the buyer
    if (refund.buyerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only the buyer can cancel a refund request' },
        { status: 403 }
      )
    }

    // Check if refund is still pending
    if (refund.status !== 'PENDING') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Cannot cancel a processed refund' },
        { status: 400 }
      )
    }

    // Delete refund
    await prisma.refund.delete({
      where: { id: refundId },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Refund request cancelled successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete refund error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
