import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { createDisputeSchema } from '@/lib/validations/dispute'
import { withCsrfAndRateLimit } from '@/lib/with-csrf'
import { RateLimits } from '@/lib/rate-limit'
import { ApiResponse } from '@/types'

/**
 * POST /api/disputes - Create a new dispute
 */
async function createDisputeHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [data, validationError] = await validate(request, createDisputeSchema)
    if (validationError) return validationError

    const { orderId, reason, description, buyerEvidence } = data

    // Verify order exists and user is the buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true }
    })

    if (!order) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.buyerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You can only create disputes for your own orders' },
        { status: 403 }
      )
    }

    // Check if order already has an open dispute
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        orderId,
        status: { in: ['OPEN', 'IN_REVIEW', 'AWAITING_RESPONSE', 'ESCALATED'] }
      }
    })

    if (existingDispute) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'An active dispute already exists for this order' },
        { status: 400 }
      )
    }

    // Create the dispute
    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        buyerId: user.userId,
        sellerId: order.sellerId,
        reason,
        description,
        buyerEvidence: buyerEvidence ? JSON.stringify(buyerEvidence) : null
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
        message: 'Dispute created successfully. An admin will review it shortly.'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create dispute error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/disputes - Get user's disputes
 */
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
    const role = searchParams.get('role') // 'buyer' or 'seller'
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const where: any = {}

    // Filter by user role
    if (role === 'buyer') {
      where.buyerId = user.userId
    } else if (role === 'seller') {
      where.sellerId = user.userId
    } else {
      // Show both buyer and seller disputes
      where.OR = [{ buyerId: user.userId }, { sellerId: user.userId }]
    }

    if (status) {
      where.status = status
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          order: {
            include: {
              product: { select: { title: true, thumbnailUrl: true } },
              buyer: { select: { username: true } },
              seller: { select: { username: true } }
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.dispute.count({ where })
    ])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          disputes,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get disputes error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfAndRateLimit(
  { limit: RateLimits.API.limit, window: RateLimits.API.window, namespace: 'disputes' },
  createDisputeHandler
)
