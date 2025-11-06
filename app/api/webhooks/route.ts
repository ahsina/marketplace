import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { nanoid } from 'nanoid'

// GET /api/webhooks - Get user's webhooks
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.userId },
      include: {
        logs: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: webhooks })
  } catch (error) {
    console.error('Get webhooks error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get webhooks' }, { status: 500 })
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { url, events } = await request.json()

    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json({ success: false, error: 'URL and events array required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL' }, { status: 400 })
    }

    // Validate events
    const validEvents = ['ORDER_CREATED', 'ORDER_COMPLETED', 'ORDER_REFUNDED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'REVIEW_CREATED']
    for (const event of events) {
      if (!validEvents.includes(event)) {
        return NextResponse.json({ success: false, error: `Invalid event: ${event}` }, { status: 400 })
      }
    }

    // Generate webhook secret
    const secret = `whsec_${nanoid(32)}`

    const webhook = await prisma.webhook.create({
      data: {
        userId: user.userId,
        url,
        secret,
        events: JSON.stringify(events)
      }
    })

    return NextResponse.json({
      success: true,
      data: webhook,
      message: 'Webhook created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create webhook error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create webhook' }, { status: 500 })
  }
}

// DELETE /api/webhooks - Delete webhook
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { webhookId } = await request.json()

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId }
    })

    if (!webhook) {
      return NextResponse.json({ success: false, error: 'Webhook not found' }, { status: 404 })
    }

    if (webhook.userId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    await prisma.webhook.delete({
      where: { id: webhookId }
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully'
    })
  } catch (error) {
    console.error('Delete webhook error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete webhook' }, { status: 500 })
  }
}
