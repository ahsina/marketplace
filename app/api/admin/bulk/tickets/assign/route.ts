import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkAssignTicketsSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/tickets/assign - Bulk assign tickets
 */
async function bulkAssignTicketsHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkAssignTicketsSchema)
    if (validationError) return validationError

    const { ticketIds, assignedTo } = data

    // Verify assignedTo user is an admin
    const targetAdmin = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { role: true, username: true }
    })

    if (!targetAdmin || targetAdmin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Target user must be an admin' },
        { status: 400 }
      )
    }

    // Assign tickets
    const result = await prisma.ticket.updateMany({
      where: {
        id: { in: ticketIds },
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      data: {
        assignedTo,
        status: 'IN_PROGRESS'
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          count: result.count,
          assignedTo: {
            id: assignedTo,
            username: targetAdmin.username
          }
        },
        message: `Successfully assigned ${result.count} ticket(s) to ${targetAdmin.username}`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk assign tickets error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkAssignTicketsHandler)
