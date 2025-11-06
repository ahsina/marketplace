import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { dispatchWebhook } from '@/lib/webhook-dispatcher'
import { sendEmail } from '@/lib/email'

// POST /api/admin/products/[id]/approve - Approve product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Upsert approval (since productId is unique, there's only one approval per product)
    const approval = await prisma.productApproval.upsert({
      where: { productId },
      update: {
        reviewedBy: user.userId,
        reviewedAt: new Date(),
        status: 'APPROVED',
        rejectionReason: null
      },
      create: {
        productId,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
        status: 'APPROVED'
      }
    })

    // Send email notification to seller
    sendEmail({
      to: product.seller.email,
      subject: 'Product Approved - CryptoMarket',
      html: `
        <h2>Your product has been approved!</h2>
        <p>Hi ${product.seller.username},</p>
        <p>Great news! Your product <strong>${product.title}</strong> has been approved and is now live on the marketplace.</p>
        <p>Customers can now discover and purchase your product.</p>
        <p>Thank you for your contribution to our marketplace!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">CryptoMarket - Anonymous Digital Marketplace</p>
      `,
      text: `Your product "${product.title}" has been approved and is now live!`
    }).catch(err => console.error('Failed to send approval email:', err))

    // Dispatch webhook
    dispatchWebhook('PRODUCT_CREATED', {
      productId: product.id,
      name: product.title,
      price: product.price,
      sellerId: product.sellerId,
      approvedAt: new Date().toISOString()
    }, product.sellerId).catch(err => console.error('Failed to dispatch webhook:', err))

    return NextResponse.json({
      success: true,
      data: approval,
      message: 'Product approved successfully'
    })
  } catch (error) {
    console.error('Approve product error:', error)
    return NextResponse.json({ success: false, error: 'Failed to approve product' }, { status: 500 })
  }
}
