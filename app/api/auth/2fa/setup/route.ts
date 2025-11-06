import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

// POST /api/auth/2fa/setup - Generate 2FA secret and QR code
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

    // Check if 2FA is already enabled
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { twoFactorEnabled: true, username: true, email: true }
    })

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is already enabled' },
        { status: 400 }
      )
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CryptoMarket (${dbUser.username})`,
      issuer: 'CryptoMarket'
    })

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '')

    // Store secret (not enabled yet)
    await prisma.user.update({
      where: { id: user.userId },
      data: { twoFactorSecret: secret.base32 }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeDataUrl
        },
        message: 'Scan this QR code with your authenticator app'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}
