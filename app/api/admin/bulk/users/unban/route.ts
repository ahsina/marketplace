import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkUnbanUsersSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/users/unban - Bulk unban users
 */
async function bulkUnbanUsersHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkUnbanUsersSchema)
    if (validationError) return validationError

    const { userIds } = data

    // Perform bulk unban
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        isBanned: true
      },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedUntil: null,
        banReason: null,
        bannedBy: null
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { count: result.count },
        message: `Successfully unbanned ${result.count} user(s)`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk unban users error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkUnbanUsersHandler)
