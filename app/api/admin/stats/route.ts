import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get platform statistics
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue,
      recentUsers,
      recentOrders,
      topProducts,
      topSellers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { platformFee: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          subscriptionTier: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { username: true } },
          seller: { select: { username: true } },
          product: { select: { title: true } },
        },
      }),
      prisma.product.findMany({
        take: 10,
        orderBy: { downloadCount: 'desc' },
        include: {
          seller: { select: { username: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: 'SELLER' },
        take: 10,
        include: {
          ordersAsSeller: {
            where: { status: 'COMPLETED' },
          },
          productsAsSellerV2: {
            where: { isActive: true },
          },
        },
        orderBy: {
          ordersAsSeller: {
            _count: 'desc',
          },
        },
      }),
    ])

    // Calculate statistics
    const platformRevenue = totalRevenue._sum.platformFee || 0

    // Process top sellers
    const topSellersWithStats = topSellers.map((seller) => ({
      id: seller.id,
      username: seller.username,
      totalSales: seller.ordersAsSeller.length,
      totalProducts: seller.productsAsSellerV2.length,
      revenue: seller.ordersAsSeller.reduce((sum, order) => sum + order.sellerAmount, 0),
    }))

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          stats: {
            totalUsers,
            totalProducts,
            totalOrders,
            completedOrders,
            pendingOrders,
            platformRevenue,
          },
          recentUsers,
          recentOrders,
          topProducts,
          topSellers: topSellersWithStats,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
