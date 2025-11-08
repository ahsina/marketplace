import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { withCsrfAndRateLimit } from '@/lib/with-csrf'
import { RateLimits } from '@/lib/rate-limit'
import { validate } from '@/lib/validate'
import { createCryptoPaymentSchema } from '@/lib/validations/order'
import { paygate, getCurrentPaymentSettings } from '@/lib/paygate'
import { withIdempotency } from '@/lib/idempotency'
import { createEscrow } from '@/lib/escrow'
import { recordPaymentAttempt } from '@/lib/payment-retry'

/**
 * POST /api/payments/crypto - Create a payment link with PayGate.to
 *
 * Customers can pay with:
 * - Credit/Debit Cards
 * - Apple Pay / Google Pay
 * - Bank Transfers
 *
 * Merchant receives USDC on Polygon network
 */
async function createPaymentHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const [data, validationError] = await validate(request, createCryptoPaymentSchema)
    if (validationError) return validationError

    const { orderIds } = data

    // Fetch orders
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        buyerId: user.userId,
        status: 'PENDING',
      },
      include: {
        product: {
          select: {
            title: true,
          },
        },
        buyer: {
          select: {
            email: true,
          },
        },
      },
    })

    if (orders.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No valid orders found' },
        { status: 400 }
      )
    }

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const primaryOrder = orders[0]

    // Create PayGate payment link
    let paymentLink
    try {
      paymentLink = await paygate.createPaymentLink({
        orderId: primaryOrder.id,
        amount: totalAmount,
        currency: 'USD',
        customerEmail: primaryOrder.buyer.email,
        multiProvider: true, // Show provider selection (MoonPay, Banxa, etc.)
      })

      console.log(`✅ Created PayGate payment link for order ${primaryOrder.id}`)
    } catch (error) {
      console.error('PayGate payment link creation error:', error)

      // Record failed payment attempt
      const tempTransaction = await prisma.transaction.create({
        data: {
          amount: totalAmount,
          currency: 'USD',
          cryptoCurrency: 'USDC', // PayGate.to pays out in USDC
          cryptoAmount: totalAmount, // Approximate 1:1 for USDC
          walletAddress: 'pending',
          status: 'FAILED',
          paymentGateway: 'paygate',
          gatewayResponse: JSON.stringify({ error: String(error) }),
          userId: user.userId,
          orderId: primaryOrder.id,
        },
      })

      await recordPaymentAttempt(tempTransaction.id, 1, 'FAILED', 'PAYMENT_GATEWAY_ERROR', String(error))

      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to create payment link. Please try again.' },
        { status: 500 }
      )
    }

    // Create transactions for each order
    const transactions = await Promise.all(
      orders.map(async (order) => {
        return await prisma.transaction.create({
          data: {
            amount: order.totalAmount,
            currency: 'USD',
            cryptoCurrency: 'USDC',
            cryptoAmount: order.totalAmount, // Approximate 1:1
            walletAddress: paymentLink.encryptedAddress,
            status: 'PENDING',
            paymentGateway: 'paygate',
            gatewayResponse: JSON.stringify({
              ipnToken: paymentLink.ipnToken,
              paymentUrl: paymentLink.url,
              encryptedAddress: paymentLink.encryptedAddress,
            }),
            userId: user.userId,
            orderId: order.id,
          },
        })
      })
    )

    // Create escrow for high-value orders (based on settings)
    const settings = await getCurrentPaymentSettings()
    if (settings.escrowEnabled && totalAmount >= settings.escrowThreshold) {
      for (const order of orders) {
        try {
          await createEscrow(order.id)
          console.log(`✅ Created escrow for order ${order.id} (amount: $${totalAmount} >= threshold: $${settings.escrowThreshold})`)
        } catch (error) {
          console.error(`Failed to create escrow for order ${order.id}:`, error)
          // Continue even if escrow fails - payment can still proceed
        }
      }
    }

    // Update orders to PROCESSING status
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: 'PROCESSING' },
    })

    // Record initial payment attempt
    await recordPaymentAttempt(transactions[0].id, 1, 'SUCCESS', undefined, 'Payment link created successfully')

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        paymentId: transactions[0].id,
        paymentUrl: paymentLink.url,
        amount: totalAmount,
        currency: 'USD',
        payoutCurrency: 'USDC',
        payoutNetwork: 'Polygon',
        ipnToken: paymentLink.ipnToken,
        // Payment methods available
        paymentMethods: [
          'Credit/Debit Card',
          'Apple Pay',
          'Google Pay',
          'Bank Transfer',
        ],
        // Redirect user to this URL to complete payment
        redirectUrl: paymentLink.url,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
    })
  } catch (error) {
    console.error('Crypto payment error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// Apply middleware: idempotency, CSRF, rate limiting
export const POST = withIdempotency(
  withCsrfAndRateLimit(
    { ...RateLimits.PAYMENT, namespace: 'payments:crypto' },
    createPaymentHandler
  )
)
