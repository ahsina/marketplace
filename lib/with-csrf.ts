import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken, requiresCsrfProtection } from './csrf'
import { getUserFromRequest } from './auth'

/**
 * Higher-order function to wrap API routes with CSRF protection
 *
 * @example
 * export const POST = withCsrf(
 *   async (request) => {
 *     // Your API logic here
 *     return NextResponse.json({ success: true })
 *   }
 * )
 */
export function withCsrf<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): (...args: Parameters<T>) => Promise<NextResponse> {
  return async (...args: Parameters<T>): Promise<NextResponse> => {
    const request = args[0] as NextRequest

    // Check if CSRF protection is required for this request
    if (!requiresCsrfProtection(request)) {
      // Skip CSRF validation for safe methods and excluded paths
      return handler(...args)
    }

    // Get user ID if authenticated
    const user = getUserFromRequest(request)
    const userId = user?.userId

    // Validate CSRF token
    const isValid = validateCsrfToken(request, userId)

    if (!isValid) {
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'Invalid or missing CSRF token. Please refresh and try again.',
          code: 'CSRF_VALIDATION_FAILED'
        },
        { status: 403 }
      )
    }

    // CSRF token is valid, proceed with handler
    return handler(...args)
  }
}

/**
 * Combine CSRF protection with rate limiting
 *
 * @example
 * export const POST = withCsrfAndRateLimit(
 *   { limit: 10, window: 60 },
 *   async (request) => {
 *     return NextResponse.json({ success: true })
 *   }
 * )
 */
export function withCsrfAndRateLimit<T extends (...args: any[]) => Promise<NextResponse>>(
  rateLimitOptions: { limit: number; window: number; namespace?: string },
  handler: T
): (...args: Parameters<T>) => Promise<NextResponse> {
  // Import rate limit wrapper dynamically to avoid circular dependency
  const { withRateLimit } = require('./with-rate-limit')

  // First apply CSRF protection, then rate limiting
  const csrfProtectedHandler = withCsrf(handler)
  return withRateLimit(rateLimitOptions, csrfProtectedHandler)
}
