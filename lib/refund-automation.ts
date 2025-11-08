import { prisma } from './prisma'

/**
 * Automated Refund Processing
 *
 * This module provides automated refund approval/rejection based on configurable rules.
 */

interface RefundRule {
  name: string
  check: (refund: any, order: any) => Promise<boolean>
  action: 'APPROVE' | 'REJECT' | 'REVIEW'
  reason: string
}

/**
 * Auto-approve refunds for orders under $10
 */
const lowValueRefundRule: RefundRule = {
  name: 'Low Value Auto-Approve',
  check: async (refund, order) => {
    return order.totalAmount < 10
  },
  action: 'APPROVE',
  reason: 'Low value order - auto-approved'
}

/**
 * Auto-approve refunds requested within 24 hours of purchase (cooling-off period)
 */
const coolingOffPeriodRule: RefundRule = {
  name: 'Cooling-Off Period',
  check: async (refund, order) => {
    const hoursSincePurchase = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60)
    return hoursSincePurchase < 24
  },
  action: 'APPROVE',
  reason: '24-hour cooling-off period - auto-approved'
}

/**
 * Auto-reject refunds if product has been downloaded more than 3 times
 */
const multipleDownloadsRule: RefundRule = {
  name: 'Multiple Downloads Check',
  check: async (refund, order) => {
    const downloads = await prisma.download.count({
      where: {
        buyerId: order.buyerId,
        productId: order.productId
      }
    })
    return downloads > 3
  },
  action: 'REJECT',
  reason: 'Product has been downloaded multiple times - refund denied'
}

/**
 * Auto-reject refunds if user has high refund rate (abuse prevention)
 */
const highRefundRateRule: RefundRule = {
  name: 'High Refund Rate Check',
  check: async (refund, order) => {
    const [totalOrders, refundedOrders] = await Promise.all([
      prisma.order.count({
        where: { buyerId: order.buyerId, status: { in: ['COMPLETED', 'REFUNDED'] } }
      }),
      prisma.order.count({
        where: { buyerId: order.buyerId, status: 'REFUNDED' }
      })
    ])

    if (totalOrders < 3) return false // Not enough history

    const refundRate = (refundedOrders / totalOrders) * 100
    return refundRate > 50
  },
  action: 'REJECT',
  reason: 'High refund rate detected - requires manual review'
}

/**
 * Send to manual review if product value is high
 */
const highValueReviewRule: RefundRule = {
  name: 'High Value Manual Review',
  check: async (refund, order) => {
    return order.totalAmount >= 100
  },
  action: 'REVIEW',
  reason: 'High value order - requires manual review'
}

/**
 * Auto-reject if refund is requested after 30 days
 */
const expiredRefundWindowRule: RefundRule = {
  name: 'Refund Window Expired',
  check: async (refund, order) => {
    const daysSincePurchase = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    return daysSincePurchase > 30
  },
  action: 'REJECT',
  reason: 'Refund window expired (30 days) - refund denied'
}

// All rules in priority order (first matching rule wins)
const refundRules: RefundRule[] = [
  expiredRefundWindowRule,      // Check expiry first
  multipleDownloadsRule,        // Check for abuse
  highRefundRateRule,           // Check user history
  highValueReviewRule,          // Send expensive items to review
  coolingOffPeriodRule,         // Auto-approve cooling-off
  lowValueRefundRule,           // Auto-approve low value
]

/**
 * Process a refund request automatically
 */
export async function processRefundAutomatically(refundId: string): Promise<{
  processed: boolean
  action: 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW'
  reason: string
}> {
  try {
    // Get refund with order details
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            product: true,
            buyer: true,
            seller: true
          }
        }
      }
    })

    if (!refund) {
      return { processed: false, action: 'PENDING_REVIEW', reason: 'Refund not found' }
    }

    if (refund.status !== 'PENDING') {
      return { processed: false, action: 'PENDING_REVIEW', reason: 'Refund already processed' }
    }

    // Run through rules in order
    for (const rule of refundRules) {
      const matches = await rule.check(refund, refund.order)

      if (matches) {
        if (rule.action === 'APPROVE') {
          await approveRefund(refundId, 'SYSTEM', rule.reason)
          return { processed: true, action: 'APPROVED', reason: rule.reason }
        } else if (rule.action === 'REJECT') {
          await rejectRefund(refundId, 'SYSTEM', rule.reason)
          return { processed: true, action: 'REJECTED', reason: rule.reason }
        } else {
          // REVIEW - flag for manual review
          await flagForManualReview(refundId, rule.reason)
          return { processed: true, action: 'PENDING_REVIEW', reason: rule.reason }
        }
      }
    }

    // No rules matched - send to manual review by default
    await flagForManualReview(refundId, 'No automatic rule matched - requires manual review')
    return { processed: true, action: 'PENDING_REVIEW', reason: 'Requires manual review' }

  } catch (error) {
    console.error('Auto-process refund error:', error)
    return { processed: false, action: 'PENDING_REVIEW', reason: 'Error processing refund' }
  }
}

/**
 * Approve a refund and update order status
 */
async function approveRefund(refundId: string, approvedBy: string, notes: string) {
  const refund = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: 'APPROVED',
      sellerResponse: notes,
      processedAt: new Date()
    },
    include: { order: true }
  })

  // Update order status to REFUNDED
  await prisma.order.update({
    where: { id: refund.orderId },
    data: { status: 'REFUNDED' }
  })

  // In a real system, would initiate actual payment refund here through payment gateway
  // This would involve calling the payment processor's refund API

  return refund
}

/**
 * Reject a refund
 */
async function rejectRefund(refundId: string, rejectedBy: string, notes: string) {
  return await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: 'REJECTED',
      sellerResponse: notes,
      processedAt: new Date()
    }
  })
}

/**
 * Flag a refund for manual review
 */
async function flagForManualReview(refundId: string, notes: string) {
  return await prisma.refund.update({
    where: { id: refundId },
    data: {
      sellerResponse: notes,
      updatedAt: new Date()
    }
  })
}

/**
 * Process all pending refunds automatically (can be run as a cron job)
 */
export async function processAllPendingRefunds(): Promise<{
  total: number
  approved: number
  rejected: number
  review: number
  errors: number
}> {
  try {
    const pendingRefunds = await prisma.refund.findMany({
      where: { status: 'PENDING' },
      take: 100 // Process in batches
    })

    const results = {
      total: pendingRefunds.length,
      approved: 0,
      rejected: 0,
      review: 0,
      errors: 0
    }

    for (const refund of pendingRefunds) {
      const result = await processRefundAutomatically(refund.id)

      if (!result.processed) {
        results.errors++
      } else if (result.action === 'APPROVED') {
        results.approved++
      } else if (result.action === 'REJECTED') {
        results.rejected++
      } else {
        results.review++
      }
    }

    return results

  } catch (error) {
    console.error('Process all refunds error:', error)
    return {
      total: 0,
      approved: 0,
      rejected: 0,
      review: 0,
      errors: 1
    }
  }
}
