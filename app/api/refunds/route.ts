import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Create a refund request
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderId, reason } = body

    if (!orderId || !reason || reason.trim().length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Order ID and reason are required' },
        { status: 400 }
      )
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            title: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify the user is the buyer
    if (order.buyerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if order is already refunded
    if (order.status === 'REFUNDED') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'This order has already been refunded' },
        { status: 400 }
      )
    }

    // Check if a refund request already exists for this order
    const existingRefund = await prisma.refund.findFirst({
      where: { orderId },
    })

    if (existingRefund) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'A refund request already exists for this order' },
        { status: 400 }
      )
    }

    // Create refund request
    const refund = await prisma.refund.create({
      data: {
        orderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        reason: reason.trim(),
        refundAmount: order.totalAmount,
      },
    })

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: order.sellerId,
        type: 'ORDER',
        title: 'New Refund Request',
        message: `A buyer has requested a refund for "${order.product.title}"`,
        link: `/dashboard/refunds`,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: refund,
        message: 'Refund request submitted successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create refund request error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get refunds (for buyers or sellers)
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'buyer'

    let refunds

    if (role === 'seller') {
      // Get refunds for seller's orders
      refunds = await prisma.refund.findMany({
        where: {
          sellerId: user.userId,
        },
        include: {
          order: {
            include: {
              product: {
                select: {
                  title: true,
                },
              },
              buyer: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } else {
      // Get refunds for buyer's orders
      refunds = await prisma.refund.findMany({
        where: {
          buyerId: user.userId,
        },
        include: {
          order: {
            include: {
              product: {
                select: {
                  title: true,
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
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: refunds,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get refunds error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
