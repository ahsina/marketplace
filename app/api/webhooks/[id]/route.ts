import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PATCH /api/webhooks/[id] - Update webhook (activate/deactivate, change events)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: webhookId } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { isActive, events } = await request.json()

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId }
    })

    if (!webhook) {
      return NextResponse.json({ success: false, error: 'Webhook not found' }, { status: 404 })
    }

    if (webhook.userId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const data: any = {}
    if (isActive !== undefined) data.isActive = isActive
    if (events) {
      // Validate events
      const validEvents = ['ORDER_CREATED', 'ORDER_COMPLETED', 'ORDER_REFUNDED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'REVIEW_CREATED']
      for (const event of events) {
        if (!validEvents.includes(event)) {
          return NextResponse.json({ success: false, error: `Invalid event: ${event}` }, { status: 400 })
        }
      }
      data.events = JSON.stringify(events)
    }

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Webhook updated successfully'
    })
  } catch (error) {
    console.error('Update webhook error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update webhook' }, { status: 500 })
  }
}

// GET /api/webhooks/[id]/logs - Get webhook logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: webhookId } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId }
    })

    if (!webhook) {
      return NextResponse.json({ success: false, error: 'Webhook not found' }, { status: 404 })
    }

    if (webhook.userId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.webhookLog.count({ where: { webhookId } })
    ])

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get webhook logs error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get logs' }, { status: 500 })
  }
}
