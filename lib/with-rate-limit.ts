import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIdentifier, createRateLimitHeaders, RateLimitOptions } from './rate-limit'

/**
 * Higher-order function to wrap API routes with rate limiting
 *
 * @example
 * export const POST = withRateLimit(
 *   { limit: 5, window: 900 },
 *   async (request) => {
 *     // Your API logic here
 *     return NextResponse.json({ success: true })
 *   }
 * )
 */
export function withRateLimit<T extends (...args: any[]) => Promise<NextResponse>>(
  options: Omit<RateLimitOptions, 'identifier'>,
  handler: T
): (...args: Parameters<T>) => Promise<NextResponse> {
  return async (...args: Parameters<T>): Promise<NextResponse> => {
    const request = args[0] as NextRequest

    // Get client identifier from request
    const identifier = getClientIdentifier(request)

    // Check rate limit
    const result = await rateLimit({
      identifier,
      ...options
    })

    // Add rate limit headers
    const headers = createRateLimitHeaders(result)

    // If rate limited, return 429
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: headers['Retry-After']
        },
        {
          status: 429,
          headers
        }
      )
    }

    // Call the original handler
    const response = await handler(...args)

    // Add rate limit headers to successful response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Manually check rate limit (for custom logic)
 */
export async function checkRateLimit(
  request: NextRequest,
  options: Omit<RateLimitOptions, 'identifier'>
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const identifier = getClientIdentifier(request)
  const result = await rateLimit({ identifier, ...options })
  const headers = createRateLimitHeaders(result)

  return {
    allowed: result.success,
    headers
  }
}
