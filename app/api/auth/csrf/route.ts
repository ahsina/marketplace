import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { generateCsrfToken, getCsrfCookieOptions } from '@/lib/csrf'
import { ApiResponse } from '@/types'

/**
 * GET /api/auth/csrf - Get CSRF token
 *
 * This endpoint generates a CSRF token for the current session.
 * The token can be used in X-CSRF-Token header for protected requests.
 */
export async function GET(request: NextRequest) {
  try {
    // Get user if authenticated (optional)
    const user = getUserFromRequest(request)
    const userId = user?.userId

    // Generate CSRF token
    const token = generateCsrfToken(userId)

    // Create response
    const response = NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { csrfToken: token },
        message: 'CSRF token generated'
      },
      { status: 200 }
    )

    // Set CSRF token in cookie (for convenience)
    const cookieOptions = getCsrfCookieOptions()
    response.cookies.set('csrf-token', token, cookieOptions)

    return response
  } catch (error) {
    console.error('CSRF token generation error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}
