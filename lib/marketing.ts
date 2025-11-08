import { prisma } from './prisma'

/**
 * Marketing Tools Service
 *
 * Email campaigns, promotions, and newsletter management
 */

/**
 * Check if a promotion is valid and applicable
 */
export async function validatePromotion(
  promotionId: string,
  userId: string,
  productIds: string[],
  totalAmount: number
): Promise<{
  valid: boolean
  discount: number
  error?: string
}> {
  try {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    })

    if (!promotion) {
      return { valid: false, discount: 0, error: 'Promotion not found' }
    }

    // Check if active
    if (!promotion.isActive) {
      return { valid: false, discount: 0, error: 'Promotion is not active' }
    }

    // Check date range
    const now = new Date()
    if (now < promotion.startDate || now > promotion.endDate) {
      return { valid: false, discount: 0, error: 'Promotion has expired' }
    }

    // Check minimum purchase
    if (promotion.minimumPurchase && totalAmount < promotion.minimumPurchase) {
      return {
        valid: false,
        discount: 0,
        error: `Minimum purchase of $${promotion.minimumPurchase} required`
      }
    }

    // Check product eligibility
    if (promotion.productIds) {
      const eligibleProducts = JSON.parse(promotion.productIds) as string[]
      const hasEligibleProduct = productIds.some(id => eligibleProducts.includes(id))
      if (!hasEligibleProduct) {
        return { valid: false, discount: 0, error: 'Promotion not applicable to these products' }
      }
    }

    // Check usage limits
    if (promotion.maxTotalUses && promotion.currentUses >= promotion.maxTotalUses) {
      return { valid: false, discount: 0, error: 'Promotion usage limit reached' }
    }

    // Check per-user limit
    if (promotion.maxUsesPerUser) {
      const userUsageCount = await prisma.promotionUsage.count({
        where: {
          promotionId,
          userId
        }
      })

      if (userUsageCount >= promotion.maxUsesPerUser) {
        return { valid: false, discount: 0, error: 'You have reached the usage limit for this promotion' }
      }
    }

    // Calculate discount
    let discount = 0

    switch (promotion.type) {
      case 'PERCENTAGE_OFF':
        discount = totalAmount * ((promotion.discountPercentage || 0) / 100)
        break
      case 'FIXED_AMOUNT_OFF':
        discount = promotion.discountAmount || 0
        break
      case 'FREE_SHIPPING':
        discount = 0 // Shipping handling would be implemented elsewhere
        break
      default:
        discount = 0
    }

    return { valid: true, discount }
  } catch (error) {
    console.error('Validate promotion error:', error)
    return { valid: false, discount: 0, error: 'Failed to validate promotion' }
  }
}

/**
 * Apply a promotion and record usage
 */
export async function applyPromotion(
  promotionId: string,
  userId: string,
  orderId: string,
  discount: number
): Promise<void> {
  await prisma.$transaction([
    // Record usage
    prisma.promotionUsage.create({
      data: {
        promotionId,
        userId,
        orderId,
        discount
      }
    }),
    // Increment usage count
    prisma.promotion.update({
      where: { id: promotionId },
      data: {
        currentUses: { increment: 1 }
      }
    })
  ])
}

/**
 * Get active promotions
 */
export async function getActivePromotions(filters?: {
  productId?: string
  categoryId?: string
  sellerId?: string
}) {
  const now = new Date()

  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Filter by product/category/seller if specified
  if (filters) {
    return promotions.filter(promo => {
      if (filters.productId && promo.productIds) {
        const ids = JSON.parse(promo.productIds) as string[]
        if (!ids.includes(filters.productId)) return false
      }

      if (filters.categoryId && promo.categoryIds) {
        const ids = JSON.parse(promo.categoryIds) as string[]
        if (!ids.includes(filters.categoryId)) return false
      }

      if (filters.sellerId && promo.sellerIds) {
        const ids = JSON.parse(promo.sellerIds) as string[]
        if (!ids.includes(filters.sellerId)) return false
      }

      return true
    })
  }

  return promotions
}

/**
 * Send email campaign (placeholder - integrate with email service)
 */
export async function sendEmailCampaign(campaignId: string): Promise<{
  success: boolean
  sent: number
  failed: number
}> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId }
  })

  if (!campaign) {
    return { success: false, sent: 0, failed: 0 }
  }

  // Get recipients
  let recipients: Array<{ id: string; email: string }> = []

  if (campaign.recipientIds) {
    const ids = JSON.parse(campaign.recipientIds) as string[]
    recipients = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true }
    })
  } else {
    const where: any = {}
    if (campaign.targetRole && campaign.targetRole !== 'ALL') {
      where.role = campaign.targetRole
    }
    if (campaign.targetTier) {
      where.subscriptionTier = campaign.targetTier
    }

    recipients = await prisma.user.findMany({
      where,
      select: { id: true, email: true }
    })
  }

  // In production, integrate with Resend or SendGrid
  // For now, just simulate sending
  const totalRecipients = recipients.length

  // Update campaign
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
      totalRecipients,
      sent: totalRecipients
    }
  })

  return {
    success: true,
    sent: totalRecipients,
    failed: 0
  }
}

/**
 * Subscribe to newsletter
 */
export async function subscribeToNewsletter(email: string, userId?: string): Promise<{
  success: boolean
  alreadySubscribed: boolean
}> {
  try {
    // Check if already subscribed
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email }
    })

    if (existing) {
      if (existing.isActive) {
        return { success: false, alreadySubscribed: true }
      }

      // Reactivate subscription
      await prisma.newsletterSubscription.update({
        where: { email },
        data: {
          isActive: true,
          subscribedAt: new Date(),
          unsubscribedAt: null
        }
      })

      return { success: true, alreadySubscribed: false }
    }

    // Create new subscription
    await prisma.newsletterSubscription.create({
      data: {
        email,
        userId,
        isActive: true
      }
    })

    return { success: true, alreadySubscribed: false }
  } catch (error) {
    console.error('Subscribe to newsletter error:', error)
    return { success: false, alreadySubscribed: false }
  }
}

/**
 * Unsubscribe from newsletter
 */
export async function unsubscribeFromNewsletter(email: string): Promise<boolean> {
  try {
    const result = await prisma.newsletterSubscription.updateMany({
      where: { email, isActive: true },
      data: {
        isActive: false,
        unsubscribedAt: new Date()
      }
    })

    return result.count > 0
  } catch (error) {
    console.error('Unsubscribe from newsletter error:', error)
    return false
  }
}
