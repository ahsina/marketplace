import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkBanUsersSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/users/ban - Bulk ban users
 */
async function bulkBanUsersHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkBanUsersSchema)
    if (validationError) return validationError

    const { userIds, reason, duration } = data

    // Calculate ban expiry
    const bannedUntil = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null

    // Perform bulk ban
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        role: { not: 'ADMIN' } // Prevent banning admins
      },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedUntil,
        banReason: reason,
        bannedBy: admin.userId
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          count: result.count,
          bannedUntil: bannedUntil,
          isPermanent: !bannedUntil
        },
        message: `Successfully banned ${result.count} user(s)`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk ban users error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkBanUsersHandler)
