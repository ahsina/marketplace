import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { emailOrUsername, password } = await request.json()

    // Validation
    if (!emailOrUsername || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Email/username and password are required' },
        { status: 400 }
      )
    }

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

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { user: userWithoutPassword, token },
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
