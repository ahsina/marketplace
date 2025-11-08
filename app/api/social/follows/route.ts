import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { withCsrf } from '@/lib/with-csrf'
import { z } from 'zod'
import { validate } from '@/lib/validate'
import { ApiResponse } from '@/types'

const followSchema = z.object({
  followingId: z.string().cuid('Invalid user ID format')
})

/**
 * GET /api/social/follows - Get user's follows
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
    const type = searchParams.get('type') || 'following' // 'following' or 'followers'
    const userId = searchParams.get('userId') || user.userId

    let follows

    if (type === 'following') {
      // Users this person is following
      follows = await prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' }
      })

      // Get user details for each following
      const followingIds = follows.map(f => f.followingId)
      const users = await prisma.user.findMany({
        where: { id: { in: followingIds } },
        select: {
          id: true,
          username: true,
          role: true,
          isVerifiedSeller: true
        }
      })

      const followsWithUsers = follows.map(f => ({
        ...f,
        user: users.find(u => u.id === f.followingId)
      }))

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: {
            follows: followsWithUsers,
            count: follows.length
          }
        },
        { status: 200 }
      )
    } else {
      // Users following this person
      follows = await prisma.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' }
      })

      const followerIds = follows.map(f => f.followerId)
      const users = await prisma.user.findMany({
        where: { id: { in: followerIds } },
        select: {
          id: true,
          username: true,
          role: true,
          isVerifiedSeller: true
        }
      })

      const followsWithUsers = follows.map(f => ({
        ...f,
        user: users.find(u => u.id === f.followerId)
      }))

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: {
            follows: followsWithUsers,
            count: follows.length
          }
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Get follows error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/follows - Follow a user
 */
async function followHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [data, validationError] = await validate(request, followSchema)
    if (validationError) return validationError

    const { followingId } = data

    // Can't follow yourself
    if (followingId === user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, username: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.userId,
          followingId
        }
      }
    })

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You are already following this user' },
        { status: 400 }
      )
    }

    // Create follow
    const follow = await prisma.follow.create({
      data: {
        followerId: user.userId,
        followingId
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: follow,
        message: `You are now following ${targetUser.username}`
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Follow user error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/social/follows - Unfollow a user
 */
async function unfollowHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const followingId = searchParams.get('followingId')

    if (!followingId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'followingId is required' },
        { status: 400 }
      )
    }

    // Delete follow
    const result = await prisma.follow.deleteMany({
      where: {
        followerId: user.userId,
        followingId
      }
    })

    if (result.count === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You are not following this user' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Successfully unfollowed user'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unfollow user error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(followHandler)
export const DELETE = withCsrf(unfollowHandler)
