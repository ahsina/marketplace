import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateInvoicePDF, generateInvoiceNumber } from '@/lib/invoice'

// GET /api/orders/[id]/invoice - Generate and download invoice PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Find order with all necessary data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: {
            username: true,
            email: true
          }
        },
        seller: {
          select: {
            username: true,
            email: true
          }
        },
        product: {
          select: {
            title: true
          }
        },
        transactions: {
          where: { status: 'CONFIRMED' },
          take: 1
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check authorization (buyer or seller can download)
    if (order.buyerId !== user.userId && order.sellerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to access this invoice' },
        { status: 403 }
      )
    }

    // Only generate invoices for completed orders
    if (order.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Invoice not available for incomplete orders' },
        { status: 400 }
      )
    }

    const transaction = order.transactions[0]

    // Generate invoice PDF
    const invoiceNumber = generateInvoiceNumber(order.id)
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      orderNumber: order.orderNumber,
      date: order.completedAt || order.createdAt,
      buyer: order.buyer,
      seller: order.seller,
      product: {
        title: order.product.title,
        price: order.totalAmount
      },
      totalAmount: order.totalAmount,
      platformFee: order.platformFee,
      sellerAmount: order.sellerAmount,
      paymentMethod: 'Cryptocurrency',
      cryptoAmount: transaction?.cryptoAmount,
      cryptoCurrency: transaction?.cryptoCurrency
    })

    // Return PDF as download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Invoice generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
