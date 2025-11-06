import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { testWebhook } from '@/lib/webhook-dispatcher'

// POST /api/webhooks/[id]/test - Test webhook
export async function POST(
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

    const result = await testWebhook(webhookId)

    return NextResponse.json({
      success: true,
      data: result,
      message: result.success ? 'Webhook test successful' : 'Webhook test failed'
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ success: false, error: 'Failed to test webhook' }, { status: 500 })
  }
}
