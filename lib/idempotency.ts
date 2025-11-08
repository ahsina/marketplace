import { prisma } from './prisma'
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

/**
 * Payment Idempotency
 *
 * This module ensures that duplicate payment requests with the same idempotency key
 * are not processed multiple times, preventing double charges and duplicate orders.
 */

const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'
const IDEMPOTENCY_EXPIRY_HOURS = 24

/**
 * Extract idempotency key from request headers
 */
export function getIdempotencyKey(request: NextRequest): string | null {
  return request.headers.get(IDEMPOTENCY_KEY_HEADER)
}

/**
 * Generate a unique idempotency key (for client-side use)
 */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Check if a request with the same idempotency key has been processed before
 */
export async function checkIdempotency(
  idempotencyKey: string,
  userId: string,
  endpoint: string
): Promise<{
  exists: boolean
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  response?: any
  statusCode?: number
}> {
  try {
    // Check if idempotency key exists and is not expired
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey }
    })

    if (!existing) {
      return { exists: false }
    }

    // Check if expired
    if (new Date() > existing.expiresAt) {
      // Clean up expired key
      await prisma.idempotencyKey.delete({
        where: { id: existing.id }
      }).catch(() => {})
      return { exists: false }
    }

    // Check if for same user and endpoint
    if (existing.userId !== userId || existing.endpoint !== endpoint) {
      // Idempotency key used for different request - this is an error
      throw new Error('Idempotency key reuse conflict')
    }

    return {
      exists: true,
      status: existing.status,
      response: existing.response ? JSON.parse(existing.response) : undefined,
      statusCode: existing.statusCode || undefined
    }
  } catch (error) {
    console.error('Check idempotency error:', error)
    if (error instanceof Error && error.message === 'Idempotency key reuse conflict') {
      throw error
    }
    return { exists: false }
  }
}

/**
 * Create an idempotency record for a new request
 */
export async function createIdempotencyRecord(
  idempotencyKey: string,
  userId: string,
  endpoint: string,
  requestBody?: any
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_EXPIRY_HOURS * 60 * 60 * 1000)

    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        userId,
        endpoint,
        requestBody: requestBody ? JSON.stringify(requestBody) : null,
        status: 'PROCESSING',
        expiresAt
      }
    })
  } catch (error) {
    // If duplicate key error, it means request is already being processed
    console.error('Create idempotency record error:', error)
    throw new Error('Request already in progress')
  }
}

/**
 * Update idempotency record with response
 */
export async function updateIdempotencyRecord(
  idempotencyKey: string,
  status: 'COMPLETED' | 'FAILED',
  response: any,
  statusCode: number
): Promise<void> {
  try {
    await prisma.idempotencyKey.update({
      where: { key: idempotencyKey },
      data: {
        status,
        response: JSON.stringify(response),
        statusCode
      }
    })
  } catch (error) {
    console.error('Update idempotency record error:', error)
    // Don't throw - this is a cleanup operation
  }
}

/**
 * Delete expired idempotency keys (can be run as a cron job)
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const result = await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })
    return result.count
  } catch (error) {
    console.error('Cleanup expired idempotency keys error:', error)
    return 0
  }
}

/**
 * Middleware to enforce idempotency on payment endpoints
 */
export function withIdempotency<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): (...args: Parameters<T>) => Promise<NextResponse> {
  return async (...args: Parameters<T>): Promise<NextResponse> => {
    const request = args[0] as NextRequest

    // Extract idempotency key
    const idempotencyKey = getIdempotencyKey(request)

    if (!idempotencyKey) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Idempotency-Key header is required for this endpoint'
        },
        { status: 400 }
      )
    }

    // Validate idempotency key format (should be a non-empty string, max 255 chars)
    if (idempotencyKey.length === 0 || idempotencyKey.length > 255) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid Idempotency-Key format'
        },
        { status: 400 }
      )
    }

    // Get user from request (assumes auth middleware has run)
    const getUserFromRequest = require('./auth').getUserFromRequest
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const endpoint = new URL(request.url).pathname

    try {
      // Check if request with same idempotency key exists
      const existing = await checkIdempotency(idempotencyKey, user.userId, endpoint)

      if (existing.exists) {
        // Request already processed or in progress
        if (existing.status === 'COMPLETED') {
          // Return cached response
          return NextResponse.json(
            existing.response,
            {
              status: existing.statusCode || 200,
              headers: { 'X-Idempotency-Replay': 'true' }
            }
          )
        } else if (existing.status === 'FAILED') {
          // Return cached error
          return NextResponse.json(
            existing.response,
            {
              status: existing.statusCode || 500,
              headers: { 'X-Idempotency-Replay': 'true' }
            }
          )
        } else {
          // Request is still processing
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Request with this idempotency key is already being processed'
            },
            { status: 409 }
          )
        }
      }

      // Create new idempotency record
      const body = await request.clone().json().catch(() => null)
      await createIdempotencyRecord(idempotencyKey, user.userId, endpoint, body)

      // Process the request
      const response = await handler(...args)

      // Cache the response
      const responseBody = await response.clone().json().catch(() => null)
      const status = responseBody?.success ? 'COMPLETED' : 'FAILED'
      await updateIdempotencyRecord(idempotencyKey, status, responseBody, response.status)

      return response
    } catch (error) {
      console.error('Idempotency middleware error:', error)

      if (error instanceof Error) {
        if (error.message === 'Request already in progress') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Request with this idempotency key is already being processed'
            },
            { status: 409 }
          )
        } else if (error.message === 'Idempotency key reuse conflict') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Idempotency key has been used for a different request'
            },
            { status: 422 }
          )
        }
      }

      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Get idempotency statistics
 */
export async function getIdempotencyStats(): Promise<{
  total: number
  processing: number
  completed: number
  failed: number
  expired: number
}> {
  try {
    const now = new Date()

    const [total, processing, completed, failed, expired] = await Promise.all([
      prisma.idempotencyKey.count(),
      prisma.idempotencyKey.count({ where: { status: 'PROCESSING' } }),
      prisma.idempotencyKey.count({ where: { status: 'COMPLETED' } }),
      prisma.idempotencyKey.count({ where: { status: 'FAILED' } }),
      prisma.idempotencyKey.count({ where: { expiresAt: { lt: now } } })
    ])

    return { total, processing, completed, failed, expired }
  } catch (error) {
    console.error('Get idempotency stats error:', error)
    return { total: 0, processing: 0, completed: 0, failed: 0, expired: 0 }
  }
}
