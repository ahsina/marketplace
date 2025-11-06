export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  requirement: string
}

export interface SellerStats {
  totalSales: number
  totalRevenue: number
  averageRating: number
  totalReviews: number
  totalProducts: number
  memberSince: Date
}

export const AVAILABLE_BADGES: Badge[] = [
  {
    id: 'top-seller',
    name: 'Top Seller',
    description: 'Achieved over 100 sales',
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-700',
    requirement: 'totalSales >= 100',
  },
  {
    id: 'rising-star',
    name: 'Rising Star',
    description: 'Achieved 25+ sales in first 3 months',
    icon: '⭐',
    color: 'bg-purple-100 text-purple-700',
    requirement: 'newSellerWith25Sales',
  },
  {
    id: 'quality-master',
    name: 'Quality Master',
    description: 'Maintain 4.5+ star rating with 20+ reviews',
    icon: '💎',
    color: 'bg-blue-100 text-blue-700',
    requirement: 'averageRating >= 4.5 && totalReviews >= 20',
  },
  {
    id: 'prolific-creator',
    name: 'Prolific Creator',
    description: 'Published 50+ products',
    icon: '🚀',
    color: 'bg-green-100 text-green-700',
    requirement: 'totalProducts >= 50',
  },
  {
    id: 'revenue-champion',
    name: 'Revenue Champion',
    description: 'Earned over $10,000',
    icon: '💰',
    color: 'bg-emerald-100 text-emerald-700',
    requirement: 'totalRevenue >= 10000',
  },
  {
    id: 'trusted-vendor',
    name: 'Trusted Vendor',
    description: 'Maintain 4.8+ rating with 50+ reviews',
    icon: '🛡️',
    color: 'bg-indigo-100 text-indigo-700',
    requirement: 'averageRating >= 4.8 && totalReviews >= 50',
  },
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Member for over 1 year',
    icon: '🎖️',
    color: 'bg-gray-100 text-gray-700',
    requirement: 'memberForOneYear',
  },
  {
    id: 'bestseller',
    name: 'Bestseller',
    description: 'Product with 500+ sales',
    icon: '🔥',
    color: 'bg-red-100 text-red-700',
    requirement: 'hasBestseller',
  },
]

export function calculateEarnedBadges(stats: SellerStats): Badge[] {
  const earnedBadges: Badge[] = []

  const membershipDays = Math.floor(
    (new Date().getTime() - stats.memberSince.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Top Seller
  if (stats.totalSales >= 100) {
    earnedBadges.push(AVAILABLE_BADGES.find((b) => b.id === 'top-seller')!)
  }

  // Rising Star (25+ sales in first 3 months)
  if (stats.totalSales >= 25 && membershipDays <= 90) {
    earnedBadges.push(AVAILABLE_BADGES.find((b) => b.id === 'rising-star')!)
  }

  // Quality Master
  if (stats.averageRating >= 4.5 && stats.totalReviews >= 20) {
    earnedBadges.push(AVAILABLE_BADGES.find((b) => b.id === 'quality-master')!)
  }

  // Prolific Creator
  if (stats.totalProducts >= 50) {
    earnedBadges.push(AVAILABLE_BADGES.find((b) => b.id === 'prolific-creator')!)
  }

  // Revenue Champion
  if (stats.totalRevenue >= 10000) {
    earnedBadges.push(AVAILABLE_BADGES.find((b) => b.id === 'revenue-champion')!)
  }

  // Trusted Vendor
  if (stats.averageRating >= 4.8 && stats.totalReviews >= 50) {
    earnedBadges.push(AVAILABLE_BADGES.find((b) => b.id === 'trusted-vendor')!)
  }

  // Early Adopter
  if (membershipDays >= 365) {
    earnedBadges.push(AVAILABLE_BADGES.find((b) => b.id === 'early-adopter')!)
  }

  return earnedBadges.filter((badge) => badge !== undefined)
}

export function getNextBadges(stats: SellerStats, earnedBadges: Badge[]): Badge[] {
  const allBadges = AVAILABLE_BADGES
  const earnedIds = new Set(earnedBadges.map((b) => b.id))

  return allBadges.filter((badge) => !earnedIds.has(badge.id)).slice(0, 3)
}
