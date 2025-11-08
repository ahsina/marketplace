import Redis from 'ioredis'

// Initialize Redis client for rate limiting
let redis: Redis | null = null

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true
  })

  // Handle connection errors gracefully
  redis.on('error', (err) => {
    console.error('Redis rate limit error:', err)
  })

  // Connect lazily
  redis.connect().catch((err) => {
    console.error('Redis connection failed:', err)
    redis = null
  })
}

export interface RateLimitOptions {
  /**
   * Unique identifier for the rate limit (e.g., IP address, user ID)
   */
  identifier: string

  /**
   * Maximum number of requests allowed
   */
  limit: number

  /**
   * Time window in seconds
   */
  window: number

  /**
   * Optional namespace to group rate limits
   */
  namespace?: string
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  success: boolean

  /**
   * Number of requests remaining in the current window
   */
  remaining: number

  /**
   * Total limit
   */
  limit: number

  /**
   * Time when the rate limit resets (Unix timestamp)
   */
  reset: number

  /**
   * Whether rate limiting is enabled (false if Redis unavailable)
   */
  enabled: boolean
}

/**
 * Check if a request should be rate limited using sliding window algorithm
 */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { identifier, limit, window, namespace = 'ratelimit' } = options

  // If Redis is not available, allow all requests (fail open)
  if (!redis) {
    console.warn('Rate limiting disabled - Redis not available')
    return {
      success: true,
      remaining: limit,
      limit,
      reset: Date.now() + window * 1000,
      enabled: false
    }
  }

  const key = `${namespace}:${identifier}`
  const now = Date.now()
  const windowStart = now - window * 1000

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline()

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Count requests in current window
    pipeline.zcard(key)

    // Add current request with timestamp as score
    pipeline.zadd(key, now, `${now}:${Math.random()}`)

    // Set expiry on the key
    pipeline.expire(key, window)

    const results = await pipeline.exec()

    if (!results) {
      throw new Error('Pipeline execution failed')
    }

    // Get count after removing old entries
    const count = results[1][1] as number

    const allowed = count < limit
    const remaining = Math.max(0, limit - count - 1)
    const reset = now + window * 1000

    return {
      success: allowed,
      remaining,
      limit,
      reset,
      enabled: true
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open on errors - allow the request
    return {
      success: true,
      remaining: limit,
      limit,
      reset: now + window * 1000,
      enabled: false
    }
  }
}

/**
 * Preset rate limit configurations for common scenarios
 */
export const RateLimits = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  AUTH: {
    limit: 5,
    window: 900 // 15 minutes
  },

  /**
   * Standard rate limit for API endpoints
   * 100 requests per minute
   */
  API: {
    limit: 100,
    window: 60
  },

  /**
   * Relaxed rate limit for public endpoints
   * 1000 requests per hour
   */
  PUBLIC: {
    limit: 1000,
    window: 3600
  },

  /**
   * Strict rate limit for payment/order endpoints
   * 10 requests per minute
   */
  PAYMENT: {
    limit: 10,
    window: 60
  },

  /**
   * Moderate rate limit for upload endpoints
   * 20 requests per hour
   */
  UPLOAD: {
    limit: 20,
    window: 3600
  },

  /**
   * Very strict for registration (prevent spam)
   * 3 requests per hour
   */
  REGISTER: {
    limit: 3,
    window: 3600
  }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    // Take the first IP in the list
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp.trim()
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown'
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.reset / 1000).toString(),
    'Retry-After': result.success ? '0' : Math.ceil((result.reset - Date.now()) / 1000).toString()
  }
}
