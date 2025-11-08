import { createHmac, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'

/**
 * CSRF Token Configuration
 */
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'default-csrf-secret-change-in-production'
const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(userId?: string): string {
  const timestamp = Date.now().toString()
  const random = randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const data = `${userId || 'anonymous'}-${timestamp}-${random}`

  // Create HMAC signature
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex')

  // Combine data and signature, encode as base64
  const token = Buffer.from(`${data}.${signature}`).toString('base64')

  return token
}

/**
 * Verify a CSRF token
 */
export function verifyCsrfToken(token: string, userId?: string): boolean {
  try {
    // Decode token
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [data, signature] = decoded.split('.')

    if (!data || !signature) {
      return false
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('hex')

    if (signature !== expectedSignature) {
      return false
    }

    // Parse data
    const parts = data.split('-')
    if (parts.length < 3) {
      return false
    }

    const [tokenUserId, timestamp, _random] = parts

    // Verify user ID if provided
    if (userId && tokenUserId !== userId && tokenUserId !== 'anonymous') {
      return false
    }

    // Check expiry
    const tokenTime = parseInt(timestamp, 10)
    if (isNaN(tokenTime)) {
      return false
    }

    const now = Date.now()
    if (now - tokenTime > CSRF_TOKEN_EXPIRY) {
      return false
    }

    return true
  } catch (error) {
    console.error('CSRF token verification error:', error)
    return false
  }
}

/**
 * Get CSRF token from request
 */
export function getCsrfTokenFromRequest(request: NextRequest): string | null {
  // Check header first (preferred method)
  const headerToken = request.headers.get('X-CSRF-Token') || request.headers.get('x-csrf-token')
  if (headerToken) {
    return headerToken
  }

  // Check cookie as fallback
  const cookieToken = request.cookies.get('csrf-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

/**
 * Safe HTTP methods that don't require CSRF protection
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * Check if request requires CSRF protection
 */
export function requiresCsrfProtection(request: NextRequest): boolean {
  const method = request.method.toUpperCase()

  // Safe methods don't need CSRF protection
  if (SAFE_METHODS.includes(method)) {
    return false
  }

  const path = request.nextUrl.pathname

  // Exclude webhook endpoints (they use signature verification)
  if (path.includes('/webhook')) {
    return false
  }

  // Exclude specific API endpoints that use alternative authentication
  const excludedPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/request-reset',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
  ]

  if (excludedPaths.some(excluded => path === excluded)) {
    return false
  }

  // All other POST, PUT, PATCH, DELETE requests need CSRF protection
  return true
}

/**
 * Validate CSRF token for request
 */
export function validateCsrfToken(request: NextRequest, userId?: string): boolean {
  // Check if CSRF protection is required
  if (!requiresCsrfProtection(request)) {
    return true
  }

  // Get token from request
  const token = getCsrfTokenFromRequest(request)

  if (!token) {
    console.warn('CSRF token missing for protected endpoint:', request.nextUrl.pathname)
    return false
  }

  // Verify token
  return verifyCsrfToken(token, userId)
}

/**
 * Create CSRF cookie options
 */
export function getCsrfCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: CSRF_TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/'
  }
}
