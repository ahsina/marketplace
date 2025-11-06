import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { nanoid } from 'nanoid'

// GET /api/tickets - Get user's tickets
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const tickets = await prisma.ticket.findMany({
      where: { userId: user.userId },
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: tickets })
  } catch (error) {
    console.error('Get tickets error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get tickets' }, { status: 500 })
  }
}

// POST /api/tickets - Create ticket
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { subject, description, priority, orderId } = await request.json()
    if (!subject || !description) {
      return NextResponse.json({ success: false, error: 'Subject and description required' }, { status: 400 })
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${nanoid(10).toUpperCase()}`,
        userId: user.userId,
        subject,
        description,
        priority: priority || 'MEDIUM',
        orderId
      }
    })

    return NextResponse.json({ success: true, data: ticket, message: 'Ticket created successfully' }, { status: 201 })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create ticket' }, { status: 500 })
  }
}
