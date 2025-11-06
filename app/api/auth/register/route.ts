import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { nanoid } from 'nanoid'
import { sendEmail, getWelcomeEmail, getEmailVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, referralCode } = await request.json()

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Email, username, and password are required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            existingUser.email === email
              ? 'Email already registered'
              : 'Username already taken',
        },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate verification token (valid for 24 hours)
    const verificationToken = nanoid(64)
    const verificationExpiry = new Date()
    verificationExpiry.setHours(verificationExpiry.getHours() + 24)

    // Validate referral code if provided
    let referral = null
    if (referralCode) {
      referral = await prisma.referral.findUnique({
        where: { code: referralCode, isActive: true }
      })
      if (!referral) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid referral code' },
          { status: 400 }
        )
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        subscriptionTier: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    // Track referral conversion (no commission yet, will be added on first purchase)
    if (referral) {
      await prisma.referralConversion.create({
        data: {
          referralId: referral.id,
          newUserId: user.id,
          commission: 0 // Will be updated on first order
        }
      })

      // Increment conversion count
      await prisma.referral.update({
        where: { id: referral.id },
        data: { conversions: { increment: 1 } }
      })
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })

    // Send welcome email (async, don't wait)
    sendEmail(getWelcomeEmail(user.username, user.email)).catch(err =>
      console.error('Failed to send welcome email:', err)
    )

    // Send verification email (async, don't wait)
    sendEmail(getEmailVerificationEmail(user.email, user.username, verificationToken)).catch(err =>
      console.error('Failed to send verification email:', err)
    )

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { user, token },
        message: 'Account created successfully. Please check your email to verify your account.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
