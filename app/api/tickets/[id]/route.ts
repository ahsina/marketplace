import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/tickets/[id] - Get ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    // Check authorization
    if (ticket.userId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get ticket' }, { status: 500 })
  }
}

// PATCH /api/tickets/[id] - Update ticket (close, reopen)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { status } = await request.json()

    const ticket = await prisma.ticket.findUnique({
      where: { id }
    })

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    // Check authorization
    if (ticket.userId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    // Users can only close/reopen their own tickets
    if (user.role !== 'ADMIN' && status !== 'CLOSED' && status !== 'OPEN') {
      return NextResponse.json({ success: false, error: 'Invalid status change' }, { status: 400 })
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    })

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: 'Ticket updated successfully'
    })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update ticket' }, { status: 500 })
  }
}
