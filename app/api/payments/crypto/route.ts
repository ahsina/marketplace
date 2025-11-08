import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { withCsrfAndRateLimit } from '@/lib/with-csrf'
import { RateLimits } from '@/lib/rate-limit'

// Supported cryptocurrencies with current exchange rates (mock data)
const CRYPTO_RATES: Record<string, number> = {
  BTC: 0.000023, // 1 USD = 0.000023 BTC
  ETH: 0.00035, // 1 USD = 0.00035 ETH
  USDT: 1, // 1 USD = 1 USDT
  USDC: 1, // 1 USD = 1 USDC
}

// Mock wallet addresses for different cryptocurrencies
const PLATFORM_WALLETS: Record<string, string> = {
  BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  USDT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  USDC: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
}

async function createPaymentHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderIds, cryptoCurrency } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No orders specified' },
        { status: 400 }
      )
    }

    if (!cryptoCurrency || !CRYPTO_RATES[cryptoCurrency]) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid cryptocurrency' },
        { status: 400 }
      )
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        buyerId: user.userId,
        status: 'PENDING',
      },
    })

    if (orders.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No valid orders found' },
        { status: 400 }
      )
    }

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const cryptoAmount = totalAmount * CRYPTO_RATES[cryptoCurrency]
    const walletAddress = PLATFORM_WALLETS[cryptoCurrency]

    // In a real implementation, you would:
    // 1. Call PayGate.io API to create a payment request
    // 2. Generate a unique payment address or QR code
    // 3. Set up webhook to listen for payment confirmation

    // For now, create transaction records
    const transactions = await Promise.all(
      orders.map((order) =>
        prisma.transaction.create({
          data: {
            amount: order.totalAmount,
            currency: 'USD',
            cryptoCurrency,
            cryptoAmount: order.totalAmount * CRYPTO_RATES[cryptoCurrency],
            walletAddress,
            status: 'PENDING',
            paymentGateway: 'paygate',
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

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          paymentId: transactions[0].id,
          cryptoCurrency,
          cryptoAmount,
          walletAddress,
          totalAmount,
          orders: orders.length,
          // In production, include QR code and payment instructions
          qrCode: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='50' text-anchor='middle'>QR</text></svg>`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        },
        message: 'Payment request created',
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

// Export POST with CSRF protection and rate limiting: 10 requests per minute
export const POST = withCsrfAndRateLimit(
  { ...RateLimits.PAYMENT, namespace: 'payments:crypto' },
  createPaymentHandler
)

// Get payment status
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

    if (!paymentId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Payment ID required' },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.findUnique({
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

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: transaction,
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
