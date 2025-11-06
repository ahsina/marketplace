import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Vote on a review (helpful/not helpful)
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
    const { isHelpful } = body

    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'isHelpful must be a boolean' },
        { status: 400 }
      )
    }

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if user has already voted
    const existingVote = await prisma.reviewVote.findUnique({
      where: {
        userId_reviewId: {
          userId: user.userId,
          reviewId: reviewId,
        },
      },
    })

    if (existingVote) {
      // Update existing vote
      await prisma.reviewVote.update({
        where: { id: existingVote.id },
        data: { isHelpful },
      })
    } else {
      // Create new vote
      await prisma.reviewVote.create({
        data: {
          userId: user.userId,
          reviewId: reviewId,
          isHelpful,
        },
      })
    }

    // Get updated vote counts
    const [helpfulCount, notHelpfulCount] = await Promise.all([
      prisma.reviewVote.count({
        where: {
          reviewId: reviewId,
          isHelpful: true,
        },
      }),
      prisma.reviewVote.count({
        where: {
          reviewId: reviewId,
          isHelpful: false,
        },
      }),
    ])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          helpfulCount,
          notHelpfulCount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Vote on review error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get vote counts for a review
export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewId = params.reviewId

    const user = getUserFromRequest(request)

    // Get vote counts
    const [helpfulCount, notHelpfulCount] = await Promise.all([
      prisma.reviewVote.count({
        where: {
          reviewId: reviewId,
          isHelpful: true,
        },
      }),
      prisma.reviewVote.count({
        where: {
          reviewId: reviewId,
          isHelpful: false,
        },
      }),
    ])

    // Get user's vote if authenticated
    let userVote = null
    if (user) {
      userVote = await prisma.reviewVote.findUnique({
        where: {
          userId_reviewId: {
            userId: user.userId,
            reviewId: reviewId,
          },
        },
      })
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          helpfulCount,
          notHelpfulCount,
          userVote: userVote ? userVote.isHelpful : null,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get review votes error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
