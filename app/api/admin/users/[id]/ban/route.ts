import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { withCsrf } from '@/lib/with-csrf'
import { z } from 'zod'
import { validate } from '@/lib/validate'

const banUserSchema = z.object({
  reason: z.string().min(10, 'Ban reason must be at least 10 characters').max(500, 'Ban reason must not exceed 500 characters'),
  duration: z.number().int().positive().max(365).optional(), // Days, undefined = permanent
})

/**
 * POST /api/admin/users/[id]/ban - Ban a user
 */
async function banUserHandler(
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

    const { id: userId } = await params

    // Validate request body
    const [data, validationError] = await validate(request, banUserSchema)
    if (validationError) return validationError

    const { reason, duration } = data

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true, isBanned: true }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent banning other admins
    if (user.role === 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Cannot ban administrator accounts' },
        { status: 403 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User is already banned' },
        { status: 400 }
      )
    }

    // Calculate ban expiry if temporary
    const bannedUntil = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null

    // Ban the user
    const bannedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedUntil,
        banReason: reason,
        bannedBy: admin.userId
      },
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true,
        bannedAt: true,
        bannedUntil: true,
        banReason: true
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          ...bannedUser,
          banType: bannedUntil ? 'temporary' : 'permanent',
          banDuration: duration
        },
        message: `User ${user.username} has been ${bannedUntil ? 'temporarily ' : ''}banned`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Ban user error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(banUserHandler)
