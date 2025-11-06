import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: notificationId } = await params

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      )
    }

    if (notification.userId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedNotification,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: notificationId } = await params

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      )
    }

    if (notification.userId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Notification deleted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
