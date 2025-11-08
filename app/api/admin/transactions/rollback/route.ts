import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { withCsrf } from '@/lib/with-csrf'
import { rollbackTransaction, rollbackOrder, rollbackStalePendingTransactions } from '@/lib/transaction-rollback'
import { z } from 'zod'
import { validate } from '@/lib/validate'
import { ApiResponse } from '@/types'

const rollbackTransactionSchema = z.object({
  type: z.enum(['transaction', 'order'], {
    message: 'Type must be either "transaction" or "order"'
  }),
  id: z.string().cuid('Invalid ID format'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters')
    .optional()
})

const rollbackStaleSchema = z.object({
  olderThanHours: z
    .number()
    .int()
    .positive()
    .max(168, 'Maximum 168 hours (7 days)')
    .default(24)
})

/**
 * POST /api/admin/transactions/rollback - Rollback a transaction or order
 */
async function rollbackHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, rollbackTransactionSchema)
    if (validationError) return validationError

    const { type, id, reason } = data

    let result

    if (type === 'transaction') {
      result = await rollbackTransaction(id)
    } else {
      result = await rollbackOrder(id, reason || 'Manual rollback by admin')
    }

    if (!result.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: result.error || 'Rollback failed' },
        { status: 400 }
      )
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: result.rolledBack,
        message: `Successfully rolled back ${type}`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Rollback handler error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(rollbackHandler)

/**
 * POST /api/admin/transactions/rollback?action=stale - Rollback stale pending transactions
 */
async function rollbackStaleHandler(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const [data, validationError] = await validate(request, rollbackStaleSchema)
    if (validationError) return validationError

    const { olderThanHours } = data

    const result = await rollbackStalePendingTransactions(olderThanHours)

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: result,
        message: `Found ${result.found} stale transactions, rolled back ${result.rolledBack}`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Rollback stale handler error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Route dispatcher based on query parameter
 */
export async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'stale') {
    return rollbackStaleHandler(request)
  }

  return rollbackHandler(request)
}
