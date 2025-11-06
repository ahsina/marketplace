import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json()

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

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
      },
    })

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { user, token },
        message: 'Account created successfully',
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
