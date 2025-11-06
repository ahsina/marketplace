import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/admin/tickets - Get all tickets (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (status) where.status = status
    if (priority) where.priority = priority

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ticket.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get admin tickets error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get tickets' }, { status: 500 })
  }
}

// PATCH /api/admin/tickets - Batch update tickets (assign, resolve, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { ticketId, status, assignedTo, priority } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'Ticket ID required' }, { status: 400 })
    }

    const data: any = {}
    if (status) {
      data.status = status
      if (status === 'RESOLVED' || status === 'CLOSED') {
        data.resolvedAt = new Date()
      }
    }
    if (assignedTo !== undefined) data.assignedTo = assignedTo
    if (priority) data.priority = priority

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    })

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket updated successfully'
    })
  } catch (error) {
    console.error('Update admin ticket error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update ticket' }, { status: 500 })
  }
}
