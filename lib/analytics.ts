import { prisma } from './prisma'

/**
 * Advanced Analytics Service
 *
 * Provides comprehensive analytics for revenue, users, products, and business metrics
 */

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface RevenueAnalytics {
  totalRevenue: number
  platformRevenue: number
  sellerRevenue: number
  revenueByDay: Array<{ date: string; amount: number }>
  revenueByProduct: Array<{ productId: string; productTitle: string; revenue: number }>
  revenueByCategory: Array<{ categoryId: string; categoryName: string; revenue: number }>
  topSellingProducts: Array<{ productId: string; productTitle: string; sales: number; revenue: number }>
  averageOrderValue: number
  totalOrders: number
}

export interface UserAnalytics {
  totalUsers: number
  newUsers: number
  activeUsers: number
  usersByRole: Array<{ role: string; count: number }>
  usersBySubscription: Array<{ tier: string; count: number }>
  userGrowth: Array<{ date: string; count: number }>
  retentionRate: number
  churnRate: number
}

export interface ProductAnalytics {
  totalProducts: number
  activeProducts: number
  newProducts: number
  productsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>
  totalDownloads: number
  totalViews: number
  conversionRate: number
  topViewedProducts: Array<{ productId: string; title: string; views: number }>
  topDownloadedProducts: Array<{ productId: string; title: string; downloads: number }>
}

export interface SellerAnalytics {
  totalSellers: number
  activeSellers: number
  verifiedSellers: number
  topSellers: Array<{
    sellerId: string
    username: string
    totalSales: number
    totalRevenue: number
    averageRating: number
  }>
  sellerPerformance: Array<{
    sellerId: string
    username: string
    products: number
    sales: number
    revenue: number
    rating: number
  }>
}

export interface PerformanceMetrics {
  averageResponseTime: number
  totalApiCalls: number
  errorRate: number
  uptime: number
  peakHours: Array<{ hour: number; requests: number }>
}

/**
 * Get comprehensive revenue analytics
 */
export async function getRevenueAnalytics(dateRange: DateRange): Promise<RevenueAnalytics> {
  const { startDate, endDate } = dateRange

  // Get all completed orders in date range
  const orders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  })

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const platformRevenue = orders.reduce((sum, order) => sum + order.platformFee, 0)
  const sellerRevenue = orders.reduce((sum, order) => sum + order.sellerAmount, 0)

  // Revenue by day
  const revenueByDay = orders.reduce((acc, order) => {
    const date = order.completedAt?.toISOString().split('T')[0] || ''
    const existing = acc.find(r => r.date === date)
    if (existing) {
      existing.amount += order.totalAmount
    } else {
      acc.push({ date, amount: order.totalAmount })
    }
    return acc
  }, [] as Array<{ date: string; amount: number }>)

  // Revenue by product
  const revenueByProduct = orders.reduce((acc, order) => {
    const existing = acc.find(r => r.productId === order.productId)
    if (existing) {
      existing.revenue += order.totalAmount
    } else {
      acc.push({
        productId: order.productId,
        productTitle: order.product.title,
        revenue: order.totalAmount
      })
    }
    return acc
  }, [] as Array<{ productId: string; productTitle: string; revenue: number }>)

  // Revenue by category
  const revenueByCategory = orders.reduce((acc, order) => {
    const categoryId = order.product.categoryId
    const categoryName = order.product.category.name
    const existing = acc.find(r => r.categoryId === categoryId)
    if (existing) {
      existing.revenue += order.totalAmount
    } else {
      acc.push({ categoryId, categoryName, revenue: order.totalAmount })
    }
    return acc
  }, [] as Array<{ categoryId: string; categoryName: string; revenue: number }>)

  // Top selling products
  const productSales = orders.reduce((acc, order) => {
    const existing = acc.find(p => p.productId === order.productId)
    if (existing) {
      existing.sales += 1
      existing.revenue += order.totalAmount
    } else {
      acc.push({
        productId: order.productId,
        productTitle: order.product.title,
        sales: 1,
        revenue: order.totalAmount
      })
    }
    return acc
  }, [] as Array<{ productId: string; productTitle: string; sales: number; revenue: number }>)

  const topSellingProducts = productSales.sort((a, b) => b.sales - a.sales).slice(0, 10)

  return {
    totalRevenue,
    platformRevenue,
    sellerRevenue,
    revenueByDay: revenueByDay.sort((a, b) => a.date.localeCompare(b.date)),
    revenueByProduct: revenueByProduct.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    revenueByCategory: revenueByCategory.sort((a, b) => b.revenue - a.revenue),
    topSellingProducts,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    totalOrders: orders.length
  }
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(dateRange: DateRange): Promise<UserAnalytics> {
  const { startDate, endDate } = dateRange

  const [totalUsers, newUsers, usersByRole, usersBySubscription] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    }),
    prisma.user.groupBy({
      by: ['subscriptionTier'],
      _count: { id: true }
    })
  ])

  // Get users who made at least one order in the date range (active users)
  const activeUsers = await prisma.user.count({
    where: {
      ordersAsBuyer: {
        some: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    }
  })

  // User growth by day
  const allUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  const userGrowth = allUsers.reduce((acc, user) => {
    const date = user.createdAt.toISOString().split('T')[0]
    const existing = acc.find(u => u.date === date)
    if (existing) {
      existing.count += 1
    } else {
      acc.push({ date, count: 1 })
    }
    return acc
  }, [] as Array<{ date: string; count: number }>)

  // Simple retention/churn calculation (users active in current period vs previous period)
  const previousPeriodStart = new Date(startDate)
  previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  const previousActiveUsers = await prisma.user.count({
    where: {
      ordersAsBuyer: {
        some: {
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }
    }
  })

  const retentionRate = previousActiveUsers > 0 ? (activeUsers / previousActiveUsers) * 100 : 0
  const churnRate = 100 - retentionRate

  return {
    totalUsers,
    newUsers,
    activeUsers,
    usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
    usersBySubscription: usersBySubscription.map(s => ({ tier: s.subscriptionTier, count: s._count.id })),
    userGrowth,
    retentionRate,
    churnRate
  }
}

/**
 * Get product analytics
 */
export async function getProductAnalytics(dateRange: DateRange): Promise<ProductAnalytics> {
  const { startDate, endDate } = dateRange

  const [totalProducts, activeProducts, newProducts, productsByCategory] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }),
    prisma.product.groupBy({
      by: ['categoryId'],
      _count: { id: true }
    })
  ])

  // Get categories for names
  const categories = await prisma.category.findMany({
    where: {
      id: { in: productsByCategory.map(p => p.categoryId) }
    }
  })

  const productsByCategoryWithNames = productsByCategory.map(p => {
    const category = categories.find(c => c.id === p.categoryId)
    return {
      categoryId: p.categoryId,
      categoryName: category?.name || 'Unknown',
      count: p._count.id
    }
  })

  // Get total downloads and views
  const products = await prisma.product.findMany({
    select: {
      downloadCount: true,
      viewCount: true
    }
  })

  const totalDownloads = products.reduce((sum, p) => sum + p.downloadCount, 0)
  const totalViews = products.reduce((sum, p) => sum + p.viewCount, 0)
  const conversionRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0

  // Top viewed products
  const topViewedProducts = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      viewCount: true
    },
    orderBy: {
      viewCount: 'desc'
    },
    take: 10
  })

  // Top downloaded products
  const topDownloadedProducts = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      downloadCount: true
    },
    orderBy: {
      downloadCount: 'desc'
    },
    take: 10
  })

  return {
    totalProducts,
    activeProducts,
    newProducts,
    productsByCategory: productsByCategoryWithNames,
    totalDownloads,
    totalViews,
    conversionRate,
    topViewedProducts: topViewedProducts.map(p => ({
      productId: p.id,
      title: p.title,
      views: p.viewCount
    })),
    topDownloadedProducts: topDownloadedProducts.map(p => ({
      productId: p.id,
      title: p.title,
      downloads: p.downloadCount
    }))
  }
}

/**
 * Get seller analytics
 */
export async function getSellerAnalytics(dateRange: DateRange): Promise<SellerAnalytics> {
  const { startDate, endDate } = dateRange

  const [totalSellers, verifiedSellers] = await Promise.all([
    prisma.user.count({ where: { role: 'SELLER' } }),
    prisma.user.count({ where: { role: 'SELLER', isVerifiedSeller: true } })
  ])

  // Get sellers with at least one order in the date range
  const activeSellers = await prisma.user.count({
    where: {
      role: 'SELLER',
      ordersAsSeller: {
        some: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    }
  })

  // Get top sellers
  const sellers = await prisma.user.findMany({
    where: { role: 'SELLER' },
    include: {
      ordersAsSeller: {
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      productsAsSellerV2: {
        include: {
          reviews: true
        }
      }
    }
  })

  const sellerStats = sellers.map(seller => {
    const totalSales = seller.ordersAsSeller.length
    const totalRevenue = seller.ordersAsSeller.reduce((sum, order) => sum + order.sellerAmount, 0)
    const allReviews = seller.productsAsSellerV2.flatMap(p => p.reviews)
    const averageRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0

    return {
      sellerId: seller.id,
      username: seller.username,
      products: seller.productsAsSellerV2.length,
      totalSales,
      totalRevenue,
      averageRating
    }
  })

  const topSellers = sellerStats
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
    .map(s => ({
      sellerId: s.sellerId,
      username: s.username,
      totalSales: s.totalSales,
      totalRevenue: s.totalRevenue,
      averageRating: s.averageRating
    }))

  const sellerPerformance = sellerStats.map(s => ({
    sellerId: s.sellerId,
    username: s.username,
    products: s.products,
    sales: s.totalSales,
    revenue: s.totalRevenue,
    rating: s.averageRating
  }))

  return {
    totalSellers,
    activeSellers,
    verifiedSellers,
    topSellers,
    sellerPerformance: sellerPerformance.sort((a, b) => b.revenue - a.revenue).slice(0, 20)
  }
}

/**
 * Get dashboard summary
 */
export async function getDashboardSummary(dateRange: DateRange) {
  const [revenue, users, products, sellers] = await Promise.all([
    getRevenueAnalytics(dateRange),
    getUserAnalytics(dateRange),
    getProductAnalytics(dateRange),
    getSellerAnalytics(dateRange)
  ])

  return {
    revenue,
    users,
    products,
    sellers,
    generatedAt: new Date()
  }
}

/**
 * Get seller-specific analytics
 */
export async function getSellerDashboard(sellerId: string, dateRange: DateRange) {
  const { startDate, endDate } = dateRange

  const orders = await prisma.order.findMany({
    where: {
      sellerId,
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      product: true
    }
  })

  const totalRevenue = orders.reduce((sum, order) => sum + order.sellerAmount, 0)
  const totalSales = orders.length

  const products = await prisma.product.findMany({
    where: { sellerId },
    include: {
      reviews: true,
      orders: {
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    }
  })

  const totalProducts = products.length
  const activeProducts = products.filter(p => p.isActive).length

  const productPerformance = products.map(p => {
    const sales = p.orders.length
    const revenue = p.orders.reduce((sum, order) => sum + order.sellerAmount, 0)
    const avgRating = p.reviews.length > 0
      ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
      : 0

    return {
      productId: p.id,
      title: p.title,
      sales,
      revenue,
      views: p.viewCount,
      downloads: p.downloadCount,
      averageRating: avgRating,
      reviewCount: p.reviews.length
    }
  })

  return {
    totalRevenue,
    totalSales,
    totalProducts,
    activeProducts,
    productPerformance: productPerformance.sort((a, b) => b.revenue - a.revenue),
    revenueByDay: orders.reduce((acc, order) => {
      const date = order.completedAt?.toISOString().split('T')[0] || ''
      const existing = acc.find(r => r.date === date)
      if (existing) {
        existing.amount += order.sellerAmount
      } else {
        acc.push({ date, amount: order.sellerAmount })
      }
      return acc
    }, [] as Array<{ date: string; amount: number }>)
  }
}
