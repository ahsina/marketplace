import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import speakeasy from 'speakeasy'

// POST /api/auth/2fa/verify - Verify 2FA code and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { success: false, error: '2FA code is required' },
        { status: 400 }
      )
    }

    // Get user's 2FA secret
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true }
    })

    if (!dbUser || !dbUser.twoFactorSecret) {
      return NextResponse.json(
        { success: false, error: '2FA not set up for this user' },
        { status: 400 }
      )
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: dbUser.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps before/after for clock skew
    })

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Invalid 2FA code' },
        { status: 400 }
      )
    }

    // Enable 2FA if not already enabled
    if (!dbUser.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { twoFactorEnabled: true }
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.userId,
          type: 'SYSTEM',
          title: '2FA Enabled',
          message: 'Two-factor authentication has been successfully enabled on your account.',
          link: '/settings'
        }
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: '2FA verified and enabled successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify 2FA code' },
      { status: 500 }
    )
  }
}
