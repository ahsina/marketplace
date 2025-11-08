import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { generateLicenseKey } from '@/lib/license'
import { dispatchWebhook } from '@/lib/webhook-dispatcher'
import { paygate } from '@/lib/paygate'
import { markEscrowFunded, releaseEscrow } from '@/lib/escrow'
import { recordPaymentAttempt } from '@/lib/payment-retry'

/**
 * GET /api/payments/paygate-callback
 *
 * PayGate.to callback handler - receives payment confirmation via GET request
 *
 * Callback parameters include:
 * - orderId: Our order ID
 * - value_coin: Actual USDC amount received
 * - coin: polygon_usdc or polygon_usdt
 * - txid_in: Provider-to-wallet transaction hash
 * - txid_out: Wallet-to-merchant payout transaction hash
 * - address_in: Decrypted wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse callback parameters
    const callback = paygate.parseCallback(searchParams)

    console.log(`📥 PayGate.to callback received for order ${callback.orderId}`)

    if (!callback.orderId) {
      console.error('❌ Missing orderId in callback')
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing orderId' },
        { status: 400 }
      )
    }

    // Find the transaction by order ID
    const transactions = await prisma.transaction.findMany({
      where: {
        orderId: callback.orderId,
        paymentGateway: 'paygate',
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (transactions.length === 0) {
      console.error(`❌ Transaction not found for order ${callback.orderId}`)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const transaction = transactions[0]

    // Check if already processed
    if (transaction.status === 'CONFIRMED') {
      console.log(`ℹ️  Payment already processed for order ${callback.orderId}`)
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Payment already processed',
      })
    }

    // Extract IPN token from gatewayResponse
    let ipnToken: string | null = null
    try {
      const gatewayData = JSON.parse(transaction.gatewayResponse || '{}')
      ipnToken = gatewayData.ipnToken
    } catch (error) {
      console.error('Failed to parse gatewayResponse:', error)
    }

    // Verify callback authenticity by checking payment status
    if (ipnToken) {
      try {
        const isValid = await paygate.verifyCallback(ipnToken)
        if (!isValid) {
          console.error('❌ Invalid callback - payment not confirmed')
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'Payment not confirmed' },
            { status: 401 }
          )
        }
      } catch (error) {
        console.error('Failed to verify callback:', error)
        // Continue processing - verification is best-effort
      }
    }

    // Process the payment
    const operations: any[] = [
      // Update transaction
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CONFIRMED',
          transactionHash: callback.txidOut, // Merchant payout transaction
          cryptoAmount: parseFloat(callback.valueCoin || '0'),
          confirmedAt: new Date(),
          gatewayResponse: JSON.stringify({
            ...JSON.parse(transaction.gatewayResponse || '{}'),
            callback: callback,
            txidIn: callback.txidIn,
            txidOut: callback.txidOut,
            valueCoin: callback.valueCoin,
            coin: callback.coin,
          }),
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
            status: 'ACTIVE',
          },
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
          link: `/orders`,
        },
      })
    )

    await prisma.$transaction(operations)

    // Handle escrow if exists
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { orderId: transaction.orderId },
    })

    if (escrow) {
      try {
        // Mark escrow as funded
        if (escrow.status === 'CREATED') {
          await markEscrowFunded(
            escrow.id,
            callback.txidOut,
            callback.addressIn
          )
          console.log(`✅ Escrow marked as funded for order ${transaction.order.orderNumber}`)
        }

        // Auto-release escrow for successful payments
        // (In production, you might want to wait for buyer confirmation)
        if (escrow.status === 'FUNDED') {
          await releaseEscrow(escrow.id)
          console.log(`✅ Escrow released for order ${transaction.order.orderNumber}`)
        }
      } catch (error) {
        console.error('Escrow handling error:', error)
        // Continue even if escrow fails
      }
    }

    // Record successful payment
    await recordPaymentAttempt(
      transaction.id,
      1,
      'SUCCESS',
      undefined,
      `Payment confirmed: ${callback.valueCoin} ${callback.coin}`
    )

    // Dispatch ORDER_COMPLETED webhook (async)
    dispatchWebhook(
      'ORDER_COMPLETED',
      {
        orderId: transaction.order.id,
        orderNumber: transaction.order.orderNumber,
        totalAmount: transaction.order.totalAmount,
        buyerId: transaction.order.buyerId,
        sellerId: transaction.order.sellerId,
        productId: transaction.order.productId,
        completedAt: new Date().toISOString(),
        paymentMethod: 'paygate',
        payoutCurrency: callback.coin,
        payoutAmount: callback.valueCoin,
        payoutTxHash: callback.txidOut,
      },
      transaction.order.sellerId
    ).catch((err) =>
      console.error('Failed to dispatch ORDER_COMPLETED webhook:', err)
    )

    console.log(
      `✅ Payment confirmed for order ${transaction.order.orderNumber}: ${callback.valueCoin} ${callback.coin}`
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Payment processed successfully',
    })
  } catch (error) {
    console.error('PayGate callback error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
