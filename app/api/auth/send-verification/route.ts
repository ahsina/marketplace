import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { sendEmail, getEmailVerificationEmail } from '@/lib/email'

// POST /api/auth/send-verification - Send or resend email verification
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Generate verification token (valid for 24 hours)
    const verificationToken = nanoid(64)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Update user with verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: expiresAt
      }
    })

    // Send verification email
    const emailTemplate = getEmailVerificationEmail(
      user.email,
      user.username,
      verificationToken
    )
    await sendEmail(emailTemplate)

    return NextResponse.json(
      {
        success: true,
        message: 'Verification email sent successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
