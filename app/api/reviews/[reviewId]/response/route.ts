import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Add or update seller response to a review
export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const reviewId = params.reviewId
    const body = await request.json()
    const { response } = body

    if (!response || response.trim().length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Response text is required' },
        { status: 400 }
      )
    }

    // Get the review with product info
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: {
            sellerId: true,
          },
        },
      },
    })

    if (!review) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if the user is the seller of the product
    if (review.product.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only the product seller can respond to this review' },
        { status: 403 }
      )
    }

    // Update the review with seller response
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        sellerResponse: response.trim(),
        respondedAt: new Date(),
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedReview,
        message: 'Response added successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Add seller response error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete seller response
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const reviewId = params.reviewId

    // Get the review with product info
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: {
            sellerId: true,
          },
        },
      },
    })

    if (!review) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if the user is the seller of the product
    if (review.product.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Remove the seller response
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        sellerResponse: null,
        respondedAt: null,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Response deleted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete seller response error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
