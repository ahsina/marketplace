import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/downloads - Get user's download history
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('orderId')
    const productId = searchParams.get('productId')

    const where: any = { buyerId: user.userId }
    if (orderId) where.orderId = orderId
    if (productId) where.productId = productId

    const downloads = await prisma.download.findMany({
      where,
      orderBy: { downloadedAt: 'desc' },
      take: 100 // Limit to last 100 downloads
    })

    // Get download count per order
    const downloadCounts = await prisma.download.groupBy({
      by: ['orderId'],
      where: { buyerId: user.userId },
      _count: true
    })

    return NextResponse.json({
      success: true,
      data: {
        downloads,
        downloadCounts: downloadCounts.map(dc => ({
          orderId: dc.orderId,
          count: dc._count
        }))
      },
      message: 'Download history retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching downloads:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch downloads' },
      { status: 500 }
    )
  }
}

// POST /api/downloads - Track a download (and enforce limits)
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { orderId, productId, versionId } = body

    if (!orderId || !productId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: orderId, productId' },
        { status: 400 }
      )
    }

    // Verify order belongs to user and is completed
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.buyerId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to download this product' },
        { status: 403 }
      )
    }

    if (order.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Order is not completed yet' },
        { status: 403 }
      )
    }

    if (order.productId !== productId) {
      return NextResponse.json(
        { success: false, error: 'Product does not match order' },
        { status: 400 }
      )
    }

    // Check download limit
    if (order.product.downloadLimit !== null) {
      const downloadCount = await prisma.download.count({
        where: {
          orderId,
          buyerId: user.userId
        }
      })

      if (downloadCount >= order.product.downloadLimit) {
        return NextResponse.json(
          { success: false, error: `Download limit reached (${order.product.downloadLimit} downloads allowed)` },
          { status: 403 }
        )
      }
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Track the download
    const download = await prisma.download.create({
      data: {
        orderId,
        productId,
        versionId: versionId || null,
        buyerId: user.userId,
        ipAddress: ipAddress.split(',')[0].trim(), // Get first IP if multiple
        userAgent
      }
    })

    // Increment product download count
    await prisma.product.update({
      where: { id: productId },
      data: {
        downloadCount: { increment: 1 }
      }
    })

    // Get remaining downloads
    const totalDownloads = await prisma.download.count({
      where: {
        orderId,
        buyerId: user.userId
      }
    })

    const remainingDownloads = order.product.downloadLimit
      ? order.product.downloadLimit - totalDownloads
      : null // null means unlimited

    return NextResponse.json(
      {
        success: true,
        data: {
          download,
          totalDownloads,
          downloadLimit: order.product.downloadLimit,
          remainingDownloads
        },
        message: 'Download tracked successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error tracking download:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track download' },
      { status: 500 }
    )
  }
}
