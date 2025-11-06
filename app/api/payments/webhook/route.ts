import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { generateLicenseKey } from '@/lib/license'

// This endpoint receives webhooks from the payment gateway (e.g., PayGate.io)
// when a payment is confirmed on the blockchain

export async function POST(request: NextRequest) {
  try {
    // In production, verify the webhook signature
    const webhookSecret = process.env.PAYGATE_WEBHOOK_SECRET
    const signature = request.headers.get('x-paygate-signature')

    // For demo purposes, we'll skip signature verification
    // In production: verify signature to ensure request is from PayGate

    const payload = await request.json()
    const {
      transactionId,
      transactionHash,
      status,
      cryptoCurrency,
      cryptoAmount,
      confirmations,
    } = payload

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        order: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update transaction status
    if (status === 'confirmed' && confirmations >= 1) {
      // Payment confirmed - complete the order
      const operations: any[] = [
        // Update transaction
        prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'CONFIRMED',
            transactionHash,
            confirmedAt: new Date(),
            gatewayResponse: JSON.stringify(payload),
          },
        }),

        // Update order
        prisma.order.update({
          where: { id: transaction.orderId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        }),

        // Increment product download count
        prisma.product.update({
          where: { id: transaction.order.productId },
          data: {
            downloadCount: { increment: 1 },
          },
        }),
      ]

      // Generate license key if product requires it
      if (transaction.order.product.requiresLicense) {
        const licenseKey = generateLicenseKey()
        operations.push(
          prisma.licenseKey.create({
            data: {
              key: licenseKey,
              orderId: transaction.orderId,
              productId: transaction.order.productId,
              buyerId: transaction.order.buyerId,
              maxActivations: 1, // Default to 1 activation
              status: 'ACTIVE'
            }
          })
        )
      }

      // Create notification for buyer
      operations.push(
        prisma.notification.create({
          data: {
            userId: transaction.order.buyerId,
            type: 'ORDER',
            title: 'Order Completed',
            message: `Your order ${transaction.order.orderNumber} has been completed. You can now download your product.`,
            link: `/orders`
          }
        })
      )

      await prisma.$transaction(operations)

      console.log(`✅ Payment confirmed for order ${transaction.order.orderNumber}`)
    } else if (status === 'failed') {
      // Payment failed
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'FAILED',
            gatewayResponse: JSON.stringify(payload),
          },
        }),

        prisma.order.update({
          where: { id: transaction.orderId },
          data: {
            status: 'CANCELLED',
          },
        }),
      ])

      console.log(`❌ Payment failed for order ${transaction.order.orderNumber}`)
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Webhook processed',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
