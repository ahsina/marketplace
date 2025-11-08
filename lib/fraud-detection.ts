import { prisma } from './prisma'

/**
 * Fraud Detection Utility
 *
 * This module provides basic fraud detection capabilities for the marketplace.
 * It analyzes user behavior patterns and creates alerts for suspicious activities.
 */

interface FraudCheckResult {
  isSuspicious: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  alerts: Array<{
    type: string
    description: string
  }>
}

/**
 * Check for multiple failed payment attempts
 */
export async function checkMultipleFailedPayments(userId: string): Promise<FraudCheckResult> {
  try {
    // Count failed transactions in the last 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const failedCount = await prisma.transaction.count({
      where: {
        userId,
        status: 'FAILED',
        createdAt: { gte: dayAgo }
      }
    })

    if (failedCount >= 10) {
      await createFraudAlert(userId, 'MULTIPLE_FAILED_PAYMENTS', 'CRITICAL',
        `User has ${failedCount} failed payment attempts in the last 24 hours`,
        { failedCount, timeWindow: '24h' }
      )
      return { isSuspicious: true, riskLevel: 'CRITICAL', alerts: [{ type: 'MULTIPLE_FAILED_PAYMENTS', description: `${failedCount} failed payments in 24h` }] }
    } else if (failedCount >= 5) {
      await createFraudAlert(userId, 'MULTIPLE_FAILED_PAYMENTS', 'HIGH',
        `User has ${failedCount} failed payment attempts in the last 24 hours`,
        { failedCount, timeWindow: '24h' }
      )
      return { isSuspicious: true, riskLevel: 'HIGH', alerts: [{ type: 'MULTIPLE_FAILED_PAYMENTS', description: `${failedCount} failed payments in 24h` }] }
    }

    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  } catch (error) {
    console.error('Check failed payments error:', error)
    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  }
}

/**
 * Check for suspicious refund patterns
 */
export async function checkSuspiciousRefundPattern(userId: string): Promise<FraudCheckResult> {
  try {
    // Get refund rate for user
    const [totalOrders, refundedOrders] = await Promise.all([
      prisma.order.count({ where: { buyerId: userId, status: { in: ['COMPLETED', 'REFUNDED'] } } }),
      prisma.order.count({ where: { buyerId: userId, status: 'REFUNDED' } })
    ])

    if (totalOrders < 5) return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }

    const refundRate = (refundedOrders / totalOrders) * 100

    if (refundRate >= 80) {
      await createFraudAlert(userId, 'SUSPICIOUS_REFUND_PATTERN', 'CRITICAL',
        `User has ${refundRate.toFixed(1)}% refund rate (${refundedOrders}/${totalOrders} orders)`,
        { refundRate, totalOrders, refundedOrders }
      )
      return { isSuspicious: true, riskLevel: 'CRITICAL', alerts: [{ type: 'SUSPICIOUS_REFUND_PATTERN', description: `${refundRate.toFixed(1)}% refund rate` }] }
    } else if (refundRate >= 50) {
      await createFraudAlert(userId, 'SUSPICIOUS_REFUND_PATTERN', 'HIGH',
        `User has ${refundRate.toFixed(1)}% refund rate (${refundedOrders}/${totalOrders} orders)`,
        { refundRate, totalOrders, refundedOrders }
      )
      return { isSuspicious: true, riskLevel: 'HIGH', alerts: [{ type: 'SUSPICIOUS_REFUND_PATTERN', description: `${refundRate.toFixed(1)}% refund rate` }] }
    }

    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  } catch (error) {
    console.error('Check refund pattern error:', error)
    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  }
}

/**
 * Check for unusual purchase patterns (rapid succession of orders)
 */
export async function checkUnusualPurchasePattern(userId: string): Promise<FraudCheckResult> {
  try {
    // Count orders in the last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const recentOrders = await prisma.order.count({
      where: {
        buyerId: userId,
        createdAt: { gte: hourAgo }
      }
    })

    if (recentOrders >= 20) {
      await createFraudAlert(userId, 'UNUSUAL_PURCHASE_PATTERN', 'HIGH',
        `User created ${recentOrders} orders in the last hour`,
        { orderCount: recentOrders, timeWindow: '1h' }
      )
      return { isSuspicious: true, riskLevel: 'HIGH', alerts: [{ type: 'UNUSUAL_PURCHASE_PATTERN', description: `${recentOrders} orders in 1 hour` }] }
    } else if (recentOrders >= 10) {
      await createFraudAlert(userId, 'UNUSUAL_PURCHASE_PATTERN', 'MEDIUM',
        `User created ${recentOrders} orders in the last hour`,
        { orderCount: recentOrders, timeWindow: '1h' }
      )
      return { isSuspicious: true, riskLevel: 'MEDIUM', alerts: [{ type: 'UNUSUAL_PURCHASE_PATTERN', description: `${recentOrders} orders in 1 hour` }] }
    }

    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  } catch (error) {
    console.error('Check purchase pattern error:', error)
    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  }
}

/**
 * Check for rapid account creation from same IP (to be implemented with IP tracking)
 */
export async function checkRapidAccountCreation(email: string): Promise<FraudCheckResult> {
  try {
    // Check for similar email patterns (disposable email domains)
    const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email']
    const emailDomain = email.split('@')[1]?.toLowerCase()

    if (emailDomain && disposableDomains.includes(emailDomain)) {
      return { isSuspicious: true, riskLevel: 'MEDIUM', alerts: [{ type: 'RAPID_ACCOUNT_CREATION', description: 'Disposable email detected' }] }
    }

    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  } catch (error) {
    console.error('Check rapid account creation error:', error)
    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  }
}

/**
 * Comprehensive fraud check (runs all checks)
 */
export async function runFraudChecks(userId: string, email?: string): Promise<FraudCheckResult> {
  try {
    const checks = await Promise.all([
      checkMultipleFailedPayments(userId),
      checkSuspiciousRefundPattern(userId),
      checkUnusualPurchasePattern(userId),
      email ? checkRapidAccountCreation(email) : Promise.resolve({ isSuspicious: false, riskLevel: 'LOW' as const, alerts: [] })
    ])

    // Aggregate results
    const allAlerts = checks.flatMap(c => c.alerts)
    const isSuspicious = checks.some(c => c.isSuspicious)
    const levels: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }
    const maxRiskLevel = checks.reduce<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>((max, c) => {
      return levels[c.riskLevel] > levels[max] ? c.riskLevel : max
    }, 'LOW')

    return {
      isSuspicious,
      riskLevel: maxRiskLevel,
      alerts: allAlerts
    }
  } catch (error) {
    console.error('Run fraud checks error:', error)
    return { isSuspicious: false, riskLevel: 'LOW', alerts: [] }
  }
}

/**
 * Create a fraud alert in the database
 */
async function createFraudAlert(
  userId: string,
  alertType: string,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  description: string,
  metadata?: Record<string, any>
) {
  try {
    // Check if similar alert exists in the last 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existingAlert = await prisma.fraudAlert.findFirst({
      where: {
        userId,
        alertType: alertType as any,
        createdAt: { gte: dayAgo },
        isResolved: false
      }
    })

    if (existingAlert) {
      // Update existing alert instead of creating duplicate
      return await prisma.fraudAlert.update({
        where: { id: existingAlert.id },
        data: {
          riskLevel: riskLevel as any,
          description,
          metadata: metadata ? JSON.stringify(metadata) : null,
          updatedAt: new Date()
        }
      })
    }

    // Create new alert
    return await prisma.fraudAlert.create({
      data: {
        userId,
        alertType: alertType as any,
        riskLevel: riskLevel as any,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })
  } catch (error) {
    console.error('Create fraud alert error:', error)
    return null
  }
}

/**
 * Get fraud score for a user (0-100, higher = more suspicious)
 */
export async function getUserFraudScore(userId: string): Promise<number> {
  try {
    const alerts = await prisma.fraudAlert.findMany({
      where: {
        userId,
        isResolved: false,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    })

    // Calculate score based on alert severity
    const scoreMap = { LOW: 10, MEDIUM: 25, HIGH: 40, CRITICAL: 60 }
    const totalScore = alerts.reduce((sum, alert) => sum + scoreMap[alert.riskLevel], 0)

    // Cap at 100
    return Math.min(100, totalScore)
  } catch (error) {
    console.error('Get fraud score error:', error)
    return 0
  }
}
