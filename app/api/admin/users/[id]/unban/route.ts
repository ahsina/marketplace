import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { withCsrf } from '@/lib/with-csrf'

/**
 * POST /api/admin/users/[id]/unban - Unban a user
 */
async function unbanUserHandler(
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, isBanned: true }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isBanned) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User is not banned' },
        { status: 400 }
      )
    }

    // Unban the user
    const unbannedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedUntil: null,
        banReason: null,
        bannedBy: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: unbannedUser,
        message: `User ${user.username} has been unbanned`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unban user error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(unbanUserHandler)
