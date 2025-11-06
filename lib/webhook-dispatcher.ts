import { prisma } from './prisma'
import crypto from 'crypto'

export type WebhookEvent =
  | 'ORDER_CREATED'
  | 'ORDER_COMPLETED'
  | 'ORDER_REFUNDED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'REVIEW_CREATED'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: any
}

/**
 * Generate webhook signature for verification
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Send webhook to a single URL
 */
async function sendWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload,
  webhookId: string
): Promise<{ success: boolean; statusCode?: number; response?: string }> {
  try {
    const payloadString = JSON.stringify(payload)
    const signature = generateSignature(payloadString, secret)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'User-Agent': 'CryptoMarket-Webhook/1.0'
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    const responseText = await response.text()

    // Log the webhook attempt
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event: payload.event,
        payload: payloadString,
        response: responseText.slice(0, 1000), // Limit response size
        statusCode: response.status,
        success: response.ok
      }
    })

    return {
      success: response.ok,
      statusCode: response.status,
      response: responseText
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed webhook
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event: payload.event,
        payload: JSON.stringify(payload),
        response: errorMessage,
        statusCode: 0,
        success: false
      }
    })

    return {
      success: false,
      response: errorMessage
    }
  }
}

/**
 * Dispatch webhook event to all subscribed webhooks
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  data: any,
  userId?: string
): Promise<void> {
  try {
    const where: any = { isActive: true }
    if (userId) where.userId = userId

    const webhooks = await prisma.webhook.findMany({ where })

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    }

    // Send webhooks in parallel
    const promises = webhooks
      .filter(webhook => {
        const events = JSON.parse(webhook.events) as string[]
        return events.includes(event)
      })
      .map(webhook => sendWebhook(webhook.url, webhook.secret, payload, webhook.id))

    await Promise.allSettled(promises)
  } catch (error) {
    console.error('Webhook dispatch error:', error)
  }
}

/**
 * Test webhook endpoint
 */
export async function testWebhook(webhookId: string): Promise<{
  success: boolean
  statusCode?: number
  response?: string
}> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId }
  })

  if (!webhook) {
    throw new Error('Webhook not found')
  }

  const payload: WebhookPayload = {
    event: 'ORDER_CREATED',
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test webhook'
    }
  }

  return sendWebhook(webhook.url, webhook.secret, payload, webhookId)
}
