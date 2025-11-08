import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { validate } from '@/lib/validate'
import { bulkCloseTicketsSchema } from '@/lib/validations/bulk-actions'
import { withCsrf } from '@/lib/with-csrf'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/bulk/tickets/close - Bulk close tickets
 */
async function bulkCloseTicketsHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, bulkCloseTicketsSchema)
    if (validationError) return validationError

    const { ticketIds, resolution } = data

    // Close tickets
    const result = await prisma.ticket.updateMany({
      where: {
        id: { in: ticketIds },
        status: { not: 'CLOSED' }
      },
      data: {
        status: 'CLOSED',
        resolvedAt: new Date()
      }
    })

    // Add resolution message to each ticket if provided
    if (resolution) {
      await Promise.all(
        ticketIds.map((ticketId) =>
          prisma.ticketMessage.create({
            data: {
              ticketId,
              userId: admin.userId,
              message: `Ticket closed: ${resolution}`,
              isStaff: true
            }
          }).catch(() => {
            // Ignore errors for tickets that don't exist
          })
        )
      )
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { count: result.count },
        message: `Successfully closed ${result.count} ticket(s)`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk close tickets error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(bulkCloseTicketsHandler)
