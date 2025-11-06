import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Get notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      userId: user.userId,
    }

    if (unreadOnly) {
      where.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: user.userId,
          isRead: false,
        },
      }),
    ])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          notifications,
          unreadCount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mark all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'All notifications marked as read',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Mark notifications as read error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
