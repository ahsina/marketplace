import { prisma } from './prisma'

/**
 * Payment Retry Logic
 *
 * This module handles automatic retry of failed payment transactions
 * with exponential backoff and configurable retry limits.
 */

interface RetryConfig {
  maxAttempts: number
  initialDelaySeconds: number
  maxDelaySeconds: number
  backoffMultiplier: number
  retryableErrorCodes: string[]
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelaySeconds: 30, // 30 seconds
  maxDelaySeconds: 3600, // 1 hour
  backoffMultiplier: 2, // Exponential backoff: 30s, 60s, 120s, 240s, 480s
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'GATEWAY_UNAVAILABLE',
    'RATE_LIMIT',
    'TEMPORARY_ERROR',
    'INSUFFICIENT_CONFIRMATIONS'
  ]
}

/**
 * Calculate the next retry delay using exponential backoff with jitter
 */
function calculateRetryDelay(attemptNumber: number, config: RetryConfig): number {
  const baseDelay = config.initialDelaySeconds * Math.pow(config.backoffMultiplier, attemptNumber - 1)
  const cappedDelay = Math.min(baseDelay, config.maxDelaySeconds)

  // Add jitter (±20%) to prevent thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5)
  return Math.round(cappedDelay + jitter)
}

/**
 * Check if an error is retryable based on error code
 */
function isRetryableError(errorCode: string | null, config: RetryConfig): boolean {
  if (!errorCode) return false
  return config.retryableErrorCodes.includes(errorCode)
}

/**
 * Record a payment attempt
 */
export async function recordPaymentAttempt(
  transactionId: string,
  attemptNumber: number,
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT',
  errorCode?: string,
  errorMessage?: string,
  gatewayResponse?: any
): Promise<void> {
  try {
    const config = DEFAULT_RETRY_CONFIG
    const retryDelay = status === 'FAILED' && attemptNumber < config.maxAttempts
      ? calculateRetryDelay(attemptNumber, config)
      : null

    await prisma.paymentAttempt.create({
      data: {
        transactionId,
        attemptNumber,
        status,
        errorCode,
        errorMessage,
        gatewayResponse: gatewayResponse ? JSON.stringify(gatewayResponse) : null,
        retryAfter: retryDelay ? new Date(Date.now() + retryDelay * 1000) : null,
        retryDelay,
        completedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Record payment attempt error:', error)
    // Don't throw - this is a logging operation
  }
}

/**
 * Check if a transaction should be retried
 */
export async function shouldRetryTransaction(transactionId: string): Promise<{
  shouldRetry: boolean
  attemptNumber: number
  reason?: string
}> {
  try {
    const config = DEFAULT_RETRY_CONFIG

    // Get transaction details
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        paymentAttempts: {
          orderBy: { attemptNumber: 'desc' },
          take: 1
        }
      }
    })

    if (!transaction) {
      return { shouldRetry: false, attemptNumber: 0, reason: 'Transaction not found' }
    }

    // Only retry failed transactions
    if (transaction.status !== 'FAILED') {
      return { shouldRetry: false, attemptNumber: 0, reason: 'Transaction not in failed state' }
    }

    // Get the last attempt
    const lastAttempt = transaction.paymentAttempts[0]
    const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1

    // Check if max attempts reached
    if (attemptNumber > config.maxAttempts) {
      return { shouldRetry: false, attemptNumber, reason: 'Max retry attempts reached' }
    }

    // Check if error is retryable
    if (lastAttempt && !isRetryableError(lastAttempt.errorCode, config)) {
      return { shouldRetry: false, attemptNumber, reason: 'Error not retryable' }
    }

    // Check if enough time has passed since last attempt
    if (lastAttempt?.retryAfter && new Date() < lastAttempt.retryAfter) {
      return {
        shouldRetry: false,
        attemptNumber,
        reason: `Waiting for retry delay (retry after ${lastAttempt.retryAfter.toISOString()})`
      }
    }

    return { shouldRetry: true, attemptNumber }
  } catch (error) {
    console.error('Should retry transaction error:', error)
    return { shouldRetry: false, attemptNumber: 0, reason: 'Error checking retry status' }
  }
}

/**
 * Get all transactions that are ready to be retried
 */
export async function getTransactionsReadyForRetry(): Promise<Array<{
  id: string
  orderId: string
  attemptNumber: number
}>> {
  try {
    const config = DEFAULT_RETRY_CONFIG

    // Get all failed transactions
    const failedTransactions = await prisma.transaction.findMany({
      where: {
        status: 'FAILED',
        createdAt: {
          // Don't retry transactions older than 24 hours
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        paymentAttempts: {
          orderBy: { attemptNumber: 'desc' },
          take: 1
        }
      }
    })

    // Filter to only those ready for retry
    const readyForRetry = []
    for (const transaction of failedTransactions) {
      const lastAttempt = transaction.paymentAttempts[0]
      const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1

      // Skip if max attempts reached
      if (attemptNumber > config.maxAttempts) continue

      // Skip if error is not retryable
      if (lastAttempt && !isRetryableError(lastAttempt.errorCode, config)) continue

      // Skip if waiting for retry delay
      if (lastAttempt?.retryAfter && new Date() < lastAttempt.retryAfter) continue

      readyForRetry.push({
        id: transaction.id,
        orderId: transaction.orderId,
        attemptNumber
      })
    }

    return readyForRetry
  } catch (error) {
    console.error('Get transactions ready for retry error:', error)
    return []
  }
}

/**
 * Mark a transaction as permanently failed after all retries exhausted
 */
export async function markTransactionAsPermanentlyFailed(
  transactionId: string,
  reason: string
): Promise<void> {
  try {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        gatewayResponse: reason
      }
    })

    // Also mark the order as cancelled
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { orderId: true }
    })

    if (transaction) {
      await prisma.order.update({
        where: { id: transaction.orderId },
        data: { status: 'CANCELLED' }
      })
    }
  } catch (error) {
    console.error('Mark transaction as permanently failed error:', error)
  }
}

/**
 * Process retry queue (can be run as a cron job)
 */
export async function processPaymentRetries(): Promise<{
  total: number
  retried: number
  failed: number
  errors: number
}> {
  try {
    const transactionsToRetry = await getTransactionsReadyForRetry()

    const results = {
      total: transactionsToRetry.length,
      retried: 0,
      failed: 0,
      errors: 0
    }

    for (const transaction of transactionsToRetry) {
      try {
        // In a real implementation, this would call the payment gateway again
        // For now, we just log it as a placeholder
        console.log(`Retrying payment for transaction ${transaction.id}, attempt ${transaction.attemptNumber}`)

        // Here you would call: await processPayment(transaction.id, transaction.attemptNumber)
        // For this implementation, we'll just track that it should be retried
        results.retried++
      } catch (error) {
        console.error(`Error retrying transaction ${transaction.id}:`, error)
        results.errors++
      }
    }

    return results
  } catch (error) {
    console.error('Process payment retries error:', error)
    return {
      total: 0,
      retried: 0,
      failed: 0,
      errors: 1
    }
  }
}

/**
 * Get retry statistics for a transaction
 */
export async function getTransactionRetryStats(transactionId: string): Promise<{
  totalAttempts: number
  lastAttempt?: Date
  nextRetryAfter?: Date
  isRetryable: boolean
  maxAttemptsReached: boolean
} | null> {
  try {
    const attempts = await prisma.paymentAttempt.findMany({
      where: { transactionId },
      orderBy: { attemptNumber: 'desc' }
    })

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        isRetryable: true,
        maxAttemptsReached: false
      }
    }

    const lastAttempt = attempts[0]
    const config = DEFAULT_RETRY_CONFIG

    return {
      totalAttempts: attempts.length,
      lastAttempt: lastAttempt.completedAt || lastAttempt.createdAt,
      nextRetryAfter: lastAttempt.retryAfter || undefined,
      isRetryable: isRetryableError(lastAttempt.errorCode, config),
      maxAttemptsReached: attempts.length >= config.maxAttempts
    }
  } catch (error) {
    console.error('Get transaction retry stats error:', error)
    return null
  }
}
