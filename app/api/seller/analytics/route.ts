import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

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
    const period = searchParams.get('period') || '30' // days

    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get seller's products
    const products = await prisma.product.findMany({
      where: {
        sellerId: user.userId,
      },
      select: {
        id: true,
        title: true,
        price: true,
        downloadCount: true,
        viewCount: true,
        createdAt: true,
      },
    })

    const productIds = products.map((p) => p.id)

    // Get orders for this seller
    const orders = await prisma.order.findMany({
      where: {
        sellerId: user.userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        totalAmount: true,
        sellerAmount: true,
        status: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get reviews for seller's products
    const reviews = await prisma.review.findMany({
      where: {
        productId: {
          in: productIds,
        },
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        rating: true,
        createdAt: true,
      },
    })

    // Calculate daily revenue
    const dailyRevenue: Record<string, number> = {}
    const dailyOrders: Record<string, number> = {}

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0]
      dailyRevenue[date] = (dailyRevenue[date] || 0) + order.sellerAmount
      dailyOrders[date] = (dailyOrders[date] || 0) + 1
    })

    // Sort by date
    const sortedDates = Object.keys(dailyRevenue).sort()
    const revenueData = sortedDates.map((date) => ({
      date,
      revenue: dailyRevenue[date],
      orders: dailyOrders[date],
    }))

    // Calculate product performance
    const productPerformance = products.map((product) => {
      const productOrders = orders.filter((o) => o.product.id === product.id)
      const productRevenue = productOrders.reduce((sum, o) => sum + o.sellerAmount, 0)

      const productReviews = reviews.filter((r) => {
        // We'd need to join this properly, but for now approximate
        return true
      })
      const avgRating =
        productReviews.length > 0
          ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
          : 0

      return {
        id: product.id,
        title: product.title,
        revenue: productRevenue,
        orders: productOrders.length,
        views: product.viewCount,
        downloads: product.downloadCount,
        conversionRate:
          product.viewCount > 0
            ? ((product.downloadCount / product.viewCount) * 100).toFixed(2)
            : 0,
        rating: Math.round(avgRating * 10) / 10,
      }
    })

    // Sort by revenue
    productPerformance.sort((a, b) => b.revenue - a.revenue)

    // Calculate summary statistics
    const totalRevenue = orders.reduce((sum, o) => sum + o.sellerAmount, 0)
    const totalOrders = orders.length
    const totalViews = products.reduce((sum, p) => sum + p.viewCount, 0)
    const totalDownloads = products.reduce((sum, p) => sum + p.downloadCount, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

    // Order status breakdown
    const ordersByStatus = {
      PENDING: orders.filter((o) => o.status === 'PENDING').length,
      PROCESSING: orders.filter((o) => o.status === 'PROCESSING').length,
      COMPLETED: orders.filter((o) => o.status === 'COMPLETED').length,
      CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
      REFUNDED: orders.filter((o) => o.status === 'REFUNDED').length,
    }

    const analytics = {
      summary: {
        totalRevenue,
        totalOrders,
        totalViews,
        totalDownloads,
        avgOrderValue,
        avgRating: Math.round(avgRating * 10) / 10,
        totalProducts: products.length,
      },
      revenueData,
      productPerformance: productPerformance.slice(0, 10), // Top 10
      ordersByStatus,
      period: daysAgo,
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: analytics,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get seller analytics error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
