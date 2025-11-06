import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { calculateEarnedBadges, getNextBadges, SellerStats } from '@/utils/sellerBadges'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user info
    const sellerInfo = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        createdAt: true,
      },
    })

    if (!sellerInfo) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Get seller's products
    const products = await prisma.product.findMany({
      where: {
        sellerId: user.userId,
      },
      select: {
        id: true,
        downloadCount: true,
      },
    })

    const productIds = products.map((p) => p.id)

    // Get orders
    const orders = await prisma.order.findMany({
      where: {
        sellerId: user.userId,
        status: 'COMPLETED',
      },
      select: {
        sellerAmount: true,
      },
    })

    // Get reviews
    const reviews = await prisma.review.findMany({
      where: {
        productId: {
          in: productIds,
        },
      },
      select: {
        rating: true,
      },
    })

    // Calculate stats
    const totalSales = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + o.sellerAmount, 0)
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0
    const totalReviews = reviews.length
    const totalProducts = products.length

    const stats: SellerStats = {
      totalSales,
      totalRevenue,
      averageRating,
      totalReviews,
      totalProducts,
      memberSince: sellerInfo.createdAt,
    }

    const earnedBadges = calculateEarnedBadges(stats)
    const nextBadges = getNextBadges(stats, earnedBadges)

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          stats,
          earnedBadges,
          nextBadges,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get seller badges error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
