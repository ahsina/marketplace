import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/admin/dashboard - Get comprehensive dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Get time ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // User statistics
    const [totalUsers, newUsersToday, newUsersThisWeek, newUsersThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ])

    // Calculate active users (users with orders in last 30 days)
    const activeUsers = await prisma.user.count({
      where: {
        ordersAsBuyer: {
          some: {
            createdAt: { gte: thirtyDaysAgo }
          }
        }
      }
    })

    // Product statistics
    const [totalProducts, activeProducts, pendingApproval, productsThisMonth] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.productApproval.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ])

    // Order statistics
    const [
      totalOrders,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      completedOrders,
      pendingOrders,
      refundedOrders
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'REFUNDED' } })
    ])

    // Revenue statistics
    const revenueData = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: {
        totalAmount: true,
        platformFee: true
      }
    })

    const revenueToday = await prisma.order.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: today } },
      _sum: { totalAmount: true, platformFee: true }
    })

    const revenueThisWeek = await prisma.order.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: sevenDaysAgo } },
      _sum: { totalAmount: true, platformFee: true }
    })

    const revenueThisMonth = await prisma.order.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true, platformFee: true }
    })

    // Review statistics
    const [totalReviews, reviewsThisMonth, avgRating] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.review.aggregate({
        _avg: { rating: true }
      })
    ])

    // Refund statistics
    const [pendingRefunds, approvedRefunds, rejectedRefunds] = await Promise.all([
      prisma.refund.count({ where: { status: 'PENDING' } }),
      prisma.refund.count({ where: { status: 'APPROVED' } }),
      prisma.refund.count({ where: { status: 'REJECTED' } })
    ])

    // Ticket statistics
    const [openTickets, inProgressTickets, resolvedTickets] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } })
    ])

    // Referral statistics
    const [totalReferrals, activeReferrals, totalConversions] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { isActive: true } }),
      prisma.referralConversion.count()
    ])

    const referralRevenue = await prisma.referralConversion.aggregate({
      _sum: { commission: true }
    })

    // Webhook statistics
    const [totalWebhooks, activeWebhooks, webhookDeliveries, failedWebhooks] = await Promise.all([
      prisma.webhook.count(),
      prisma.webhook.count({ where: { isActive: true } }),
      prisma.webhookLog.count(),
      prisma.webhookLog.count({ where: { success: false } })
    ])

    // Top products by sales
    const topProducts = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        downloadCount: true,
        _count: {
          select: { orders: true }
        }
      },
      orderBy: {
        orders: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // Top sellers
    const topSellers = await prisma.user.findMany({
      where: { role: 'SELLER' },
      select: {
        id: true,
        username: true,
        email: true,
        _count: {
          select: {
            productsAsSellerV2: true,
            ordersAsSeller: true
          }
        }
      },
      orderBy: {
        ordersAsSeller: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // Recent activity
    const recentOrders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        buyer: {
          select: {
            username: true
          }
        },
        product: {
          select: {
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Calculate growth rates
    const usersYesterday = await prisma.user.count({
      where: { createdAt: { lt: today, gte: yesterday } }
    })
    const userGrowthRate = usersYesterday > 0
      ? ((newUsersToday - usersYesterday) / usersYesterday) * 100
      : newUsersToday > 0 ? 100 : 0

    const ordersYesterday = await prisma.order.count({
      where: { createdAt: { lt: today, gte: yesterday } }
    })
    const orderGrowthRate = ordersYesterday > 0
      ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100
      : ordersToday > 0 ? 100 : 0

    const revenueYesterday = await prisma.order.aggregate({
      where: { status: 'COMPLETED', completedAt: { lt: today, gte: yesterday } },
      _sum: { totalAmount: true }
    })
    const revenueGrowthRate = revenueYesterday._sum.totalAmount && revenueYesterday._sum.totalAmount > 0
      ? ((Number(revenueToday._sum.totalAmount || 0) - Number(revenueYesterday._sum.totalAmount)) / Number(revenueYesterday._sum.totalAmount)) * 100
      : Number(revenueToday._sum.totalAmount || 0) > 0 ? 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          today: newUsersToday,
          thisWeek: newUsersThisWeek,
          thisMonth: newUsersThisMonth,
          active: activeUsers,
          growthRate: userGrowthRate
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          pendingApproval,
          thisMonth: productsThisMonth
        },
        orders: {
          total: totalOrders,
          today: ordersToday,
          thisWeek: ordersThisWeek,
          thisMonth: ordersThisMonth,
          completed: completedOrders,
          pending: pendingOrders,
          refunded: refundedOrders,
          growthRate: orderGrowthRate
        },
        revenue: {
          total: revenueData._sum.totalAmount || 0,
          platformFees: revenueData._sum.platformFee || 0,
          today: revenueToday._sum.totalAmount || 0,
          todayFees: revenueToday._sum.platformFee || 0,
          thisWeek: revenueThisWeek._sum.totalAmount || 0,
          thisWeekFees: revenueThisWeek._sum.platformFee || 0,
          thisMonth: revenueThisMonth._sum.totalAmount || 0,
          thisMonthFees: revenueThisMonth._sum.platformFee || 0,
          growthRate: revenueGrowthRate
        },
        reviews: {
          total: totalReviews,
          thisMonth: reviewsThisMonth,
          averageRating: avgRating._avg.rating || 0
        },
        refunds: {
          pending: pendingRefunds,
          approved: approvedRefunds,
          rejected: rejectedRefunds
        },
        tickets: {
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets
        },
        referrals: {
          total: totalReferrals,
          active: activeReferrals,
          conversions: totalConversions,
          revenue: referralRevenue._sum.commission || 0
        },
        webhooks: {
          total: totalWebhooks,
          active: activeWebhooks,
          deliveries: webhookDeliveries,
          failed: failedWebhooks,
          successRate: webhookDeliveries > 0
            ? ((webhookDeliveries - failedWebhooks) / webhookDeliveries) * 100
            : 0
        },
        topProducts,
        topSellers,
        recentOrders
      }
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get dashboard data' }, { status: 500 })
  }
}
