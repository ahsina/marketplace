import { prisma } from './prisma'

/**
 * Transaction Rollback Mechanisms
 *
 * This module provides comprehensive rollback capabilities for failed transactions,
 * ensuring data consistency and proper cleanup of related records.
 */

interface RollbackResult {
  success: boolean
  error?: string
  rolledBack: {
    order?: boolean
    transaction?: boolean
    licenseKeys?: number
    downloads?: number
    notifications?: number
  }
}

/**
 * Rollback a failed transaction and clean up related records
 */
export async function rollbackTransaction(transactionId: string): Promise<RollbackResult> {
  try {
    // Get transaction details
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        order: {
          include: {
            licenseKeys: true,
            downloads: true
          }
        }
      }
    })

    if (!transaction) {
      return {
        success: false,
        error: 'Transaction not found',
        rolledBack: {}
      }
    }

    // Only rollback failed or cancelled transactions
    if (transaction.status === 'CONFIRMED') {
      return {
        success: false,
        error: 'Cannot rollback confirmed transaction',
        rolledBack: {}
      }
    }

    const rolledBack = {
      order: false,
      transaction: false,
      licenseKeys: 0,
      downloads: 0,
      notifications: 0
    }

    // Perform rollback in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Revoke any issued license keys
      if (transaction.order.licenseKeys.length > 0) {
        const result = await tx.licenseKey.updateMany({
          where: {
            orderId: transaction.orderId,
            status: 'ACTIVE'
          },
          data: {
            status: 'REVOKED',
            revokedAt: new Date()
          }
        })
        rolledBack.licenseKeys = result.count
      }

      // 2. Delete download records (they shouldn't exist for failed transactions, but just in case)
      const deleteDownloads = await tx.download.deleteMany({
        where: { orderId: transaction.orderId }
      })
      rolledBack.downloads = deleteDownloads.count

      // 3. Delete related notifications
      const deleteNotifications = await tx.notification.deleteMany({
        where: {
          link: { contains: transaction.orderId }
        }
      })
      rolledBack.notifications = deleteNotifications.count

      // 4. Update order status
      await tx.order.update({
        where: { id: transaction.orderId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      })
      rolledBack.order = true

      // 5. Mark transaction as rolled back
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          gatewayResponse: 'Transaction rolled back',
          updatedAt: new Date()
        }
      })
      rolledBack.transaction = true
    })

    return {
      success: true,
      rolledBack
    }
  } catch (error) {
    console.error('Rollback transaction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      rolledBack: {}
    }
  }
}

/**
 * Rollback an order and all related records
 */
export async function rollbackOrder(orderId: string, reason: string): Promise<RollbackResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        transactions: true,
        licenseKeys: true,
        downloads: true,
        refunds: true
      }
    })

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
        rolledBack: {}
      }
    }

    // Cannot rollback completed orders with confirmed transactions
    const hasConfirmedTransaction = order.transactions.some(t => t.status === 'CONFIRMED')
    if (order.status === 'COMPLETED' && hasConfirmedTransaction) {
      return {
        success: false,
        error: 'Cannot rollback completed order with confirmed transactions. Create a refund instead.',
        rolledBack: {}
      }
    }

    const rolledBack = {
      order: false,
      transaction: false,
      licenseKeys: 0,
      downloads: 0,
      notifications: 0
    }

    await prisma.$transaction(async (tx) => {
      // 1. Revoke all license keys
      if (order.licenseKeys.length > 0) {
        const result = await tx.licenseKey.updateMany({
          where: {
            orderId,
            status: { in: ['ACTIVE', 'EXPIRED'] }
          },
          data: {
            status: 'REVOKED',
            revokedAt: new Date()
          }
        })
        rolledBack.licenseKeys = result.count
      }

      // 2. Delete download records
      const deleteDownloads = await tx.download.deleteMany({
        where: { orderId }
      })
      rolledBack.downloads = deleteDownloads.count

      // 3. Mark all transactions as failed
      const updateTransactions = await tx.transaction.updateMany({
        where: {
          orderId,
          status: { not: 'CONFIRMED' }
        },
        data: {
          status: 'FAILED',
          gatewayResponse: `Order rollback: ${reason}`
        }
      })
      rolledBack.transaction = updateTransactions.count > 0

      // 4. Delete notifications
      const deleteNotifications = await tx.notification.deleteMany({
        where: {
          link: { contains: orderId }
        }
      })
      rolledBack.notifications = deleteNotifications.count

      // 5. Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      })
      rolledBack.order = true

      // 6. Create refund record if there was a confirmed transaction
      if (hasConfirmedTransaction) {
        await tx.refund.create({
          data: {
            orderId,
            buyerId: order.buyerId,
            sellerId: order.sellerId,
            reason: `Order rolled back: ${reason}`,
            status: 'APPROVED',
            refundAmount: order.totalAmount,
            sellerResponse: 'Automatic rollback',
            processedAt: new Date()
          }
        })
      }
    })

    return {
      success: true,
      rolledBack
    }
  } catch (error) {
    console.error('Rollback order error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      rolledBack: {}
    }
  }
}

/**
 * Rollback multiple transactions in bulk
 */
export async function bulkRollbackTransactions(transactionIds: string[]): Promise<{
  total: number
  successful: number
  failed: number
  errors: string[]
}> {
  const results = {
    total: transactionIds.length,
    successful: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const transactionId of transactionIds) {
    try {
      const result = await rollbackTransaction(transactionId)
      if (result.success) {
        results.successful++
      } else {
        results.failed++
        if (result.error) {
          results.errors.push(`${transactionId}: ${result.error}`)
        }
      }
    } catch (error) {
      results.failed++
      results.errors.push(`${transactionId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}

/**
 * Find and rollback stale pending transactions (older than specified hours)
 */
export async function rollbackStalePendingTransactions(
  olderThanHours: number = 24
): Promise<{
  found: number
  rolledBack: number
  errors: number
}> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)

    // Find stale pending transactions
    const staleTransactions = await prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoffDate }
      },
      select: { id: true }
    })

    if (staleTransactions.length === 0) {
      return { found: 0, rolledBack: 0, errors: 0 }
    }

    const transactionIds = staleTransactions.map(t => t.id)
    const results = await bulkRollbackTransactions(transactionIds)

    return {
      found: results.total,
      rolledBack: results.successful,
      errors: results.failed
    }
  } catch (error) {
    console.error('Rollback stale pending transactions error:', error)
    return { found: 0, rolledBack: 0, errors: 1 }
  }
}

/**
 * Verify transaction integrity and rollback if inconsistent
 */
export async function verifyAndRollbackInconsistentTransactions(): Promise<{
  checked: number
  inconsistent: number
  rolledBack: number
}> {
  try {
    // Find transactions with confirmed status but no transaction hash
    const inconsistentTransactions = await prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        transactionHash: null
      },
      select: { id: true }
    })

    if (inconsistentTransactions.length === 0) {
      return { checked: 0, inconsistent: 0, rolledBack: 0 }
    }

    const transactionIds = inconsistentTransactions.map(t => t.id)
    const results = await bulkRollbackTransactions(transactionIds)

    return {
      checked: inconsistentTransactions.length,
      inconsistent: inconsistentTransactions.length,
      rolledBack: results.successful
    }
  } catch (error) {
    console.error('Verify and rollback inconsistent transactions error:', error)
    return { checked: 0, inconsistent: 0, rolledBack: 0 }
  }
}

/**
 * Get rollback statistics
 */
export async function getRollbackStats(): Promise<{
  pendingTransactions: number
  stalePendingTransactions: number
  failedTransactions: number
  cancelledOrders: number
}> {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [pendingTransactions, stalePendingTransactions, failedTransactions, cancelledOrders] =
      await Promise.all([
        prisma.transaction.count({ where: { status: 'PENDING' } }),
        prisma.transaction.count({
          where: {
            status: 'PENDING',
            createdAt: { lt: cutoffDate }
          }
        }),
        prisma.transaction.count({ where: { status: 'FAILED' } }),
        prisma.order.count({ where: { status: 'CANCELLED' } })
      ])

    return {
      pendingTransactions,
      stalePendingTransactions,
      failedTransactions,
      cancelledOrders
    }
  } catch (error) {
    console.error('Get rollback stats error:', error)
    return {
      pendingTransactions: 0,
      stalePendingTransactions: 0,
      failedTransactions: 0,
      cancelledOrders: 0
    }
  }
}
