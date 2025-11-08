import { prisma } from './prisma'

/**
 * Seller Reputation Scoring System
 *
 * Calculates reputation scores for sellers based on various metrics:
 * - Sales volume
 * - Product ratings
 * - Customer reviews
 * - Refund rate
 * - Response time to customer issues
 * - Account age
 * - Verification status
 */

interface ReputationFactors {
  salesVolume: number        // 0-100
  averageRating: number      // 0-100
  refundRate: number         // 0-100 (inverted - lower is better)
  responseTime: number       // 0-100
  accountAge: number         // 0-100
  verificationBonus: number  // 0-20
}

interface ReputationScore {
  overall: number            // 0-100
  level: 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'LEGENDARY'
  factors: ReputationFactors
  badges: string[]
}

/**
 * Calculate overall reputation score for a seller
 */
export async function calculateSellerReputation(sellerId: string): Promise<ReputationScore> {
  try {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        createdAt: true,
        isVerifiedSeller: true
      }
    })

    if (!seller) {
      return getDefaultReputation()
    }

    // Calculate each reputation factor
    const factors: ReputationFactors = {
      salesVolume: await calculateSalesVolumeScore(sellerId),
      averageRating: await calculateAverageRatingScore(sellerId),
      refundRate: await calculateRefundRateScore(sellerId),
      responseTime: await calculateResponseTimeScore(sellerId),
      accountAge: calculateAccountAgeScore(seller.createdAt),
      verificationBonus: seller.isVerifiedSeller ? 20 : 0
    }

    // Weighted average (total weights = 100)
    const overall = Math.round(
      factors.salesVolume * 0.25 +      // 25% weight
      factors.averageRating * 0.30 +    // 30% weight
      factors.refundRate * 0.20 +       // 20% weight
      factors.responseTime * 0.10 +     // 10% weight
      factors.accountAge * 0.15 +       // 15% weight
      factors.verificationBonus * 0.20  // Bonus (up to 20 points)
    )

    // Cap at 100
    const cappedOverall = Math.min(100, overall)

    // Determine level
    const level = getReputationLevel(cappedOverall)

    // Award badges
    const badges = awardBadges(factors, cappedOverall)

    return {
      overall: cappedOverall,
      level,
      factors,
      badges
    }
  } catch (error) {
    console.error('Calculate reputation error:', error)
    return getDefaultReputation()
  }
}

/**
 * Calculate sales volume score (0-100)
 */
async function calculateSalesVolumeScore(sellerId: string): Promise<number> {
  const completedOrders = await prisma.order.count({
    where: {
      sellerId,
      status: 'COMPLETED'
    }
  })

  // Score based on number of sales
  // 0 sales = 0, 100+ sales = 100
  return Math.min(100, completedOrders)
}

/**
 * Calculate average rating score (0-100)
 */
async function calculateAverageRatingScore(sellerId: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: { sellerId },
    select: { id: true }
  })

  if (products.length === 0) return 0

  const productIds = products.map(p => p.id)

  const reviews = await prisma.review.findMany({
    where: {
      productId: { in: productIds }
    },
    select: { rating: true }
  })

  if (reviews.length === 0) return 50 // Neutral score for no reviews

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  // Convert 0-5 star rating to 0-100 score
  return (averageRating / 5) * 100
}

/**
 * Calculate refund rate score (0-100, inverted)
 */
async function calculateRefundRateScore(sellerId: string): Promise<number> {
  const [totalOrders, refundedOrders] = await Promise.all([
    prisma.order.count({
      where: { sellerId, status: { in: ['COMPLETED', 'REFUNDED'] } }
    }),
    prisma.order.count({
      where: { sellerId, status: 'REFUNDED' }
    })
  ])

  if (totalOrders === 0) return 100 // No orders = perfect score

  const refundRate = (refundedOrders / totalOrders) * 100

  // Invert: 0% refund = 100 score, 100% refund = 0 score
  return Math.max(0, 100 - refundRate)
}

/**
 * Calculate response time score (0-100)
 */
async function calculateResponseTimeScore(sellerId: string): Promise<number> {
  // Get seller's tickets as assignee
  const tickets = await prisma.ticket.findMany({
    where: {
      assignedTo: sellerId,
      status: { in: ['RESOLVED', 'CLOSED'] }
    },
    select: {
      createdAt: true,
      resolvedAt: true
    },
    take: 50 // Last 50 tickets
  })

  if (tickets.length === 0) return 70 // Neutral-good score for no data

  // Calculate average response time in hours
  const responseTimes = tickets
    .filter(t => t.resolvedAt)
    .map(t => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60))

  if (responseTimes.length === 0) return 70

  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

  // Score based on response time
  // < 1 hour = 100, 24 hours = 50, 72+ hours = 0
  if (avgResponseTime < 1) return 100
  if (avgResponseTime < 24) return 100 - (avgResponseTime * 2)
  if (avgResponseTime < 72) return 50 - ((avgResponseTime - 24) / 2)
  return 0
}

/**
 * Calculate account age score (0-100)
 */
function calculateAccountAgeScore(createdAt: Date): number {
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

  // Score based on account age
  // < 30 days = 30, 90 days = 60, 180+ days = 100
  if (daysSinceCreation < 30) return 30
  if (daysSinceCreation < 90) return 30 + ((daysSinceCreation - 30) / 2)
  if (daysSinceCreation < 180) return 60 + ((daysSinceCreation - 90) / 4.5)
  return 100
}

/**
 * Get reputation level based on score
 */
function getReputationLevel(score: number): ReputationScore['level'] {
  if (score >= 90) return 'LEGENDARY'
  if (score >= 75) return 'PLATINUM'
  if (score >= 60) return 'GOLD'
  if (score >= 40) return 'SILVER'
  if (score >= 20) return 'BRONZE'
  return 'NEW'
}

/**
 * Award badges based on achievements
 */
function awardBadges(factors: ReputationFactors, overall: number): string[] {
  const badges: string[] = []

  if (factors.salesVolume >= 90) badges.push('TOP_SELLER')
  if (factors.averageRating >= 95) badges.push('HIGHLY_RATED')
  if (factors.refundRate >= 95) badges.push('TRUSTED_SELLER')
  if (factors.responseTime >= 90) badges.push('QUICK_RESPONDER')
  if (factors.accountAge >= 90) badges.push('VETERAN')
  if (factors.verificationBonus > 0) badges.push('VERIFIED')
  if (overall >= 90) badges.push('ELITE')

  return badges
}

/**
 * Get default reputation for new sellers
 */
function getDefaultReputation(): ReputationScore {
  return {
    overall: 0,
    level: 'NEW',
    factors: {
      salesVolume: 0,
      averageRating: 0,
      refundRate: 100,
      responseTime: 0,
      accountAge: 0,
      verificationBonus: 0
    },
    badges: []
  }
}

/**
 * Update seller reputation (call this after key events)
 */
export async function updateSellerReputation(sellerId: string): Promise<void> {
  try {
    const reputation = await calculateSellerReputation(sellerId)

    // Store in database or cache for fast retrieval
    // For now, we'll just calculate on-demand
    // In production, store in a separate reputation table or cache (Redis)

    console.log(`Seller ${sellerId} reputation updated: ${reputation.overall} (${reputation.level})`)
  } catch (error) {
    console.error('Update seller reputation error:', error)
  }
}

/**
 * Get sellers ranked by reputation
 */
export async function getTopSellers(limit: number = 10): Promise<Array<{
  sellerId: string
  username: string
  reputation: ReputationScore
}>> {
  try {
    const sellers = await prisma.user.findMany({
      where: {
        role: 'SELLER'
      },
      select: {
        id: true,
        username: true
      },
      take: limit * 3 // Get more than needed to filter
    })

    // Calculate reputation for each
    const sellersWithReputation = await Promise.all(
      sellers.map(async (seller) => ({
        sellerId: seller.id,
        username: seller.username,
        reputation: await calculateSellerReputation(seller.id)
      }))
    )

    // Sort by reputation score and take top N
    return sellersWithReputation
      .sort((a, b) => b.reputation.overall - a.reputation.overall)
      .slice(0, limit)

  } catch (error) {
    console.error('Get top sellers error:', error)
    return []
  }
}
