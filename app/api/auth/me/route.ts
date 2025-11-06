import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request)

    if (!userPayload) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        subscriptionTier: true,
        subscriptionExpiry: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: user,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
