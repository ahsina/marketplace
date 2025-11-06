import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Mark message as read
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

    const { id: messageId } = await params

    // Check if message exists and user is the receiver
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.receiverId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedMessage,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update message error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete message
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

    const { id: messageId } = await params

    // Check if message exists and user is sender or receiver
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Message not found' },
        { status: 404 }
      )
    }

    if (
      message.senderId !== user.userId &&
      message.receiverId !== user.userId
    ) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await prisma.message.delete({
      where: { id: messageId },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Message deleted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
