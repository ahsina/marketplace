import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// POST /api/tickets/[id]/messages - Add message to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { message } = await request.json()
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    })

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    // Check authorization
    if (ticket.userId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    // Don't allow messages on closed tickets
    if (ticket.status === 'CLOSED') {
      return NextResponse.json({ success: false, error: 'Cannot add messages to closed tickets' }, { status: 400 })
    }

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: user.userId,
        message,
        isStaff: user.role === 'ADMIN'
      }
    })

    // If user sends message, mark as open (if it was closed/resolved)
    if (ticket.status === 'RESOLVED' && user.userId === ticket.userId) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', resolvedAt: null }
      })
    }

    // If admin responds, mark as in_progress
    if (user.role === 'ADMIN' && ticket.status === 'OPEN') {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'IN_PROGRESS',
          assignedTo: ticket.assignedTo || user.userId
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: ticketMessage,
      message: 'Message added successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Add ticket message error:', error)
    return NextResponse.json({ success: false, error: 'Failed to add message' }, { status: 500 })
  }
}
