import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { withCsrfAndRateLimit } from '@/lib/with-csrf'
import { RateLimits } from '@/lib/rate-limit'
import { validate } from '@/lib/validate'
import { createCryptoPaymentSchema } from '@/lib/validations/order'
import { paygate, convertUSDToCrypto } from '@/lib/paygate'
import { withIdempotency } from '@/lib/idempotency'
import { createEscrow } from '@/lib/escrow'
import { recordPaymentAttempt } from '@/lib/payment-retry'

/**
 * POST /api/payments/crypto - Create a crypto payment with PayGate.io
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

    const { orderIds, cryptoCurrency } = data

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
            title: true
          }
        },
        buyer: {
          select: {
            email: true
          }
        }
      }
    })

    if (orders.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No valid orders found' },
        { status: 400 }
      )
    }

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    // Get crypto amount using real exchange rate from PayGate
    const cryptoAmount = await convertUSDToCrypto(totalAmount, cryptoCurrency)

    if (!cryptoAmount || cryptoAmount <= 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to get exchange rate. Please try again.' },
        { status: 500 }
      )
    }

    // Create PayGate invoice for first order (or combine if multiple)
    const primaryOrder = orders[0]
    const description = orders.length > 1
      ? `${orders.length} products: ${orders.map(o => o.product.title).join(', ')}`
      : `Order for ${primaryOrder.product.title}`

    let invoice
    try {
      invoice = await paygate.createInvoice({
        orderId: primaryOrder.id,
        amount: totalAmount,
        currency: cryptoCurrency,
        description: description.substring(0, 200), // Limit description length
        buyerEmail: primaryOrder.buyer.email,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${primaryOrder.id}`,
        expiryMinutes: 60 // 1 hour to complete payment
      })
    } catch (error) {
      console.error('PayGate invoice creation error:', error)

      // Record failed payment attempt
      const tempTransaction = await prisma.transaction.create({
        data: {
          amount: totalAmount,
          currency: 'USD',
          cryptoCurrency,
          cryptoAmount,
          walletAddress: 'pending',
          status: 'FAILED',
          paymentGateway: 'paygate',
          gatewayResponse: error instanceof Error ? error.message : 'Unknown error',
          userId: user.userId,
          orderId: primaryOrder.id
        }
      })

      await recordPaymentAttempt(
        tempTransaction.id,
        1,
        'FAILED',
        'GATEWAY_ERROR',
        error instanceof Error ? error.message : 'Failed to create payment invoice'
      )

      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to create payment. Please try again.' },
        { status: 500 }
      )
    }

    // Create transaction records for all orders
    const transactions = await Promise.all(
      orders.map((order) =>
        prisma.transaction.create({
          data: {
            amount: order.totalAmount,
            currency: 'USD',
            cryptoCurrency,
            cryptoAmount: order.totalAmount * cryptoAmount / totalAmount, // Proportional amount
            walletAddress: invoice.paymentAddress,
            transactionHash: null,
            status: 'PENDING',
            paymentGateway: 'paygate',
            gatewayResponse: JSON.stringify({
              invoiceId: invoice.id,
              expiresAt: invoice.expiresAt
            }),
            userId: user.userId,
            orderId: order.id,
          },
        })
      )
    )

    // Update orders to PROCESSING status
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: {
        status: 'PROCESSING',
      },
    })

    // Create escrow for high-value orders (optional, can be configured)
    if (totalAmount >= 100) {
      for (const order of orders) {
        await createEscrow(order.id).catch(err =>
          console.error(`Failed to create escrow for order ${order.id}:`, err)
        )
      }
    }

    // Record successful payment attempt
    await recordPaymentAttempt(
      transactions[0].id,
      1,
      'SUCCESS',
      undefined,
      undefined,
      { invoiceId: invoice.id }
    )

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          paymentId: transactions[0].id,
          invoiceId: invoice.id,
          cryptoCurrency,
          cryptoAmount: invoice.cryptoAmount,
          walletAddress: invoice.paymentAddress,
          totalAmount,
          orders: orders.length,
          qrCode: invoice.qrCode,
          expiresAt: invoice.expiresAt,
          confirmations: {
            current: invoice.confirmations,
            required: invoice.requiredConfirmations
          },
          instructions: {
            message: `Send exactly ${invoice.cryptoAmount} ${cryptoCurrency} to the address below`,
            address: invoice.paymentAddress,
            expiresIn: '60 minutes',
            network: cryptoCurrency === 'USDT' || cryptoCurrency === 'USDC' ? 'ERC-20' : cryptoCurrency
          }
        },
        message: 'Payment request created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export POST with idempotency, CSRF protection, and rate limiting
export const POST = withIdempotency(
  withCsrfAndRateLimit(
    { ...RateLimits.PAYMENT, namespace: 'payments:crypto' },
    createPaymentHandler
  )
)

/**
 * GET /api/payments/crypto - Get payment status
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')
    const invoiceId = searchParams.get('invoiceId')

    if (!paymentId && !invoiceId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Payment ID or Invoice ID required' },
        { status: 400 }
      )
    }

    let transaction

    if (paymentId) {
      transaction = await prisma.transaction.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            include: {
              product: {
                select: {
                  title: true,
                  fileUrl: true,
                  fileName: true,
                },
              },
            },
          },
        },
      })
    } else if (invoiceId) {
      transaction = await prisma.transaction.findFirst({
        where: {
          gatewayResponse: {
            contains: invoiceId
          }
        },
        include: {
          order: {
            include: {
              product: {
                select: {
                  title: true,
                  fileUrl: true,
                  fileName: true,
                },
              },
            },
          },
        },
      })
    }

    if (!transaction) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    if (transaction.userId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get latest status from PayGate if transaction is still pending
    let invoiceStatus = null
    if (transaction.status === 'PENDING' && transaction.gatewayResponse) {
      try {
        const gatewayData = JSON.parse(transaction.gatewayResponse)
        if (gatewayData.invoiceId) {
          invoiceStatus = await paygate.getInvoice(gatewayData.invoiceId)

          // Update transaction if status changed
          const normalizedStatus = invoiceStatus.status.toUpperCase()
          if (normalizedStatus !== transaction.status) {
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: normalizedStatus as any,
                transactionHash: invoiceStatus.txHash,
                confirmedAt: invoiceStatus.confirmedAt ? new Date(invoiceStatus.confirmedAt) : null
              }
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch invoice status:', error)
      }
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          ...transaction,
          invoice: invoiceStatus,
          gatewayResponse: transaction.gatewayResponse ? JSON.parse(transaction.gatewayResponse) : null
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
