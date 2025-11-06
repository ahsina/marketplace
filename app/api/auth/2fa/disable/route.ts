import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, verifyPassword } from '@/lib/auth'

// POST /api/auth/2fa/disable - Disable 2FA (requires password confirmation)
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

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required to disable 2FA' },
        { status: 400 }
      )
    }

    // Get user's password
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { password: true, twoFactorEnabled: true }
    })

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    // Verify password
    const passwordValid = await verifyPassword(password, dbUser.password)
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.userId,
        type: 'SYSTEM',
        title: '2FA Disabled',
        message: 'Two-factor authentication has been disabled on your account.',
        link: '/settings'
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: '2FA disabled successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}
