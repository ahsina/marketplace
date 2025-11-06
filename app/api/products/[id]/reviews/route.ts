import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { dispatchWebhook } from '@/lib/webhook-dispatcher'

// POST /api/products/[id]/reviews - Create a review for a product
export async function POST(
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

    const { id: productId } = await params
    const { rating, comment } = await request.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if user has purchased this product
    const purchasedOrder = await prisma.order.findFirst({
      where: {
        productId,
        buyerId: user.userId,
        status: 'COMPLETED'
      }
    })

    if (!purchasedOrder) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You must purchase this product before reviewing it' },
        { status: 403 }
      )
    }

    // Check if user has already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        productId,
        userId: user.userId
      }
    })

    if (existingReview) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You have already reviewed this product' },
        { status: 400 }
      )
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        productId,
        userId: user.userId,
        rating,
        comment: comment || null
      },
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    })

    // Dispatch REVIEW_CREATED webhook (async, don't wait)
    dispatchWebhook('REVIEW_CREATED', {
      reviewId: review.id,
      productId,
      userId: user.userId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    }, product.sellerId).catch(err => console.error('Failed to dispatch REVIEW_CREATED webhook:', err))

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: review,
        message: 'Review created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/products/[id]/reviews - Get reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.review.count({ where: { productId } })
    ])

    return NextResponse.json(
      {
        success: true,
        data: reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get reviews error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
