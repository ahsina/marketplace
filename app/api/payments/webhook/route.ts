import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { generateLicenseKey } from '@/lib/license'
import { dispatchWebhook } from '@/lib/webhook-dispatcher'
import { paygate } from '@/lib/paygate'
import { markEscrowFunded } from '@/lib/escrow'
import { recordPaymentAttempt } from '@/lib/payment-retry'

// This endpoint receives webhooks from PayGate.io when invoice status changes

export async function POST(request: NextRequest) {
  try {
    // Verify PayGate.io webhook signature
    const signature = request.headers.get('x-paygate-signature') || ''
    const rawBody = await request.text()

    if (!paygate.verifyWebhook(rawBody, signature)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload = JSON.parse(rawBody)
    const {
      invoice_id: invoiceId,
      order_id: orderId,
      status,
      crypto_currency: cryptoCurrency,
      crypto_amount: cryptoAmount,
      payment_address: paymentAddress,
      transaction_hash: transactionHash,
      confirmations = 0,
      required_confirmations: requiredConfirmations = 3,
    } = payload

    // Find the transaction by PayGate invoice ID (stored in gatewayResponse)
    // We need to search through transactions where the gatewayResponse contains this invoiceId
    const allTransactions = await prisma.transaction.findMany({
      where: {
        paymentGateway: 'paygate',
        gatewayResponse: {
          contains: invoiceId
        }
      },
      include: {
        order: {
          include: {
            product: true,
            buyer: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Find exact match by parsing gatewayResponse
    const transaction = allTransactions.find(t => {
      if (!t.gatewayResponse) return false
      try {
        const data = JSON.parse(t.gatewayResponse)
        return data.invoiceId === invoiceId
      } catch {
        return false
      }
    })

    if (!transaction) {
      console.error(`❌ Transaction not found for invoice ${invoiceId}`)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    console.log(`📥 PayGate webhook: invoice ${invoiceId}, status: ${status}, confirmations: ${confirmations}/${requiredConfirmations}`)

    // Handle PayGate.io invoice status updates
    switch (status) {
      case 'processing':
        // Payment detected, waiting for confirmations
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'PENDING',
            transactionHash: transactionHash || undefined,
            gatewayResponse: JSON.stringify(payload),
          },
        })

        // Check if escrow exists and mark as funded
        const escrow = await prisma.escrowTransaction.findUnique({
          where: { orderId: transaction.orderId },
        })

        if (escrow && transactionHash && paymentAddress) {
          await markEscrowFunded(escrow.id, transactionHash, paymentAddress)
        }

        // Record successful payment attempt
        await recordPaymentAttempt(
          transaction.id,
          1,
          'SUCCESS',
          undefined,
          `Payment detected: ${confirmations}/${requiredConfirmations} confirmations`
        )

        console.log(`⏳ Payment processing for order ${transaction.order.orderNumber}: ${confirmations}/${requiredConfirmations} confirmations`)
        break

      case 'confirmed':
      case 'completed':
        // Payment fully confirmed - complete the order
        const operations: any[] = [
          // Update transaction
          prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'CONFIRMED',
              transactionHash: transactionHash || undefined,
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
                maxActivations: 1,
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

        // Record successful payment
        await recordPaymentAttempt(
          transaction.id,
          1,
          'SUCCESS',
          undefined,
          `Payment confirmed with ${confirmations} confirmations`
        )

        // Dispatch ORDER_COMPLETED webhook (async)
        dispatchWebhook('ORDER_COMPLETED', {
          orderId: transaction.order.id,
          orderNumber: transaction.order.orderNumber,
          totalAmount: transaction.order.totalAmount,
          buyerId: transaction.order.buyerId,
          sellerId: transaction.order.sellerId,
          productId: transaction.order.productId,
          completedAt: new Date().toISOString()
        }, transaction.order.sellerId).catch(err => console.error('Failed to dispatch ORDER_COMPLETED webhook:', err))

        console.log(`✅ Payment confirmed for order ${transaction.order.orderNumber}`)
        break

      case 'expired':
        // Invoice expired without payment
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transaction.id },
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

        await recordPaymentAttempt(
          transaction.id,
          1,
          'FAILED',
          'EXPIRED',
          'Invoice expired without payment'
        )

        console.log(`⏰ Payment expired for order ${transaction.order.orderNumber}`)
        break

      case 'failed':
        // Payment failed
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transaction.id },
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

        await recordPaymentAttempt(
          transaction.id,
          1,
          'FAILED',
          'PAYMENT_FAILED',
          'Payment failed on blockchain'
        )

        console.log(`❌ Payment failed for order ${transaction.order.orderNumber}`)
        break

      default:
        console.log(`ℹ️  Unhandled invoice status: ${status}`)
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
