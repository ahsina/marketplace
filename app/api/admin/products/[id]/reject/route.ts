import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

// POST /api/admin/products/[id]/reject - Reject product
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

    const { reason } = await request.json()
    if (!reason) {
      return NextResponse.json({ success: false, error: 'Rejection reason required' }, { status: 400 })
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
        status: 'REJECTED',
        rejectionReason: reason
      },
      create: {
        productId,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
        status: 'REJECTED',
        rejectionReason: reason
      }
    })

    // Send email notification to seller
    sendEmail({
      to: product.seller.email,
      subject: 'Product Rejected - CryptoMarket',
      html: `
        <h2>Product Review Update</h2>
        <p>Hi ${product.seller.username},</p>
        <p>Unfortunately, your product <strong>${product.title}</strong> was not approved.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review the feedback and make the necessary changes. You can resubmit your product after addressing the issues.</p>
        <p>If you have any questions, please contact our support team.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">CryptoMarket - Anonymous Digital Marketplace</p>
      `,
      text: `Your product "${product.title}" was rejected. Reason: ${reason}`
    }).catch(err => console.error('Failed to send rejection email:', err))

    return NextResponse.json({
      success: true,
      data: approval,
      message: 'Product rejected successfully'
    })
  } catch (error) {
    console.error('Reject product error:', error)
    return NextResponse.json({ success: false, error: 'Failed to reject product' }, { status: 500 })
  }
}
