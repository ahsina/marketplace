import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { sendEmail, getPasswordResetEmail } from '@/lib/email'

// POST /api/auth/request-reset - Request password reset
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        },
        { status: 200 }
      )
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = nanoid(64)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // Create password reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt
      }
    })

    // Send password reset email
    const emailTemplate = getPasswordResetEmail(
      user.email,
      user.username,
      resetToken
    )
    await sendEmail(emailTemplate)

    return NextResponse.json(
      {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Request reset error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
