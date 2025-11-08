import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken, checkUserBanStatus } from '@/lib/auth'
import { ApiResponse } from '@/types'
import speakeasy from 'speakeasy'
import { withRateLimit } from '@/lib/with-rate-limit'
import { RateLimits } from '@/lib/rate-limit'
import { validate } from '@/lib/validate'
import { loginSchema } from '@/lib/validations/auth'

async function loginHandler(request: NextRequest) {
  try {
    // Validate request body
    const [data, validationError] = await validate(request, loginSchema)
    if (validationError) return validationError

    const { emailOrUsername, password, twoFactorCode } = data

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    })

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user is banned
    const banStatus = await checkUserBanStatus(user.id)
    if (banStatus && banStatus.isBanned) {
      const banMessage = banStatus.isPermanent
        ? `Your account has been permanently banned. Reason: ${banStatus.reason}`
        : `Your account is temporarily banned until ${banStatus.bannedUntil?.toLocaleString()}. Reason: ${banStatus.reason}`

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Account banned',
          data: {
            isBanned: true,
            reason: banStatus.reason,
            bannedUntil: banStatus.bannedUntil,
            isPermanent: banStatus.isPermanent
          }
        },
        { status: 403 }
      )
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: '2FA code required',
            data: { requires2FA: true }
          },
          { status: 403 }
        )
      }

      // Verify 2FA code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      })

      if (!verified) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid 2FA code' },
          { status: 401 }
        )
      }
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })

    // Return user without password and 2FA secret
    const { password: _, twoFactorSecret: __, ...userWithoutSensitiveData } = user

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { user: userWithoutSensitiveData, token },
        message: 'Logged in successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export with rate limiting: 5 requests per 15 minutes
export const POST = withRateLimit(
  { ...RateLimits.AUTH, namespace: 'auth:login' },
  loginHandler
)
