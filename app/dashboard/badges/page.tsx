'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Award, Lock, TrendingUp } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SellerBadge from '@/components/SellerBadge'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Badge, SellerStats } from '@/utils/sellerBadges'

interface BadgesData {
  stats: SellerStats
  earnedBadges: Badge[]
  nextBadges: Badge[]
}

export default function BadgesPage() {
  const [badgesData, setBadgesData] = useState<BadgesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchBadges()
  }, [isAuthenticated])

  const fetchBadges = async () => {
    try {
      const response = await fetch('/api/seller/badges')
      const data = await response.json()

      if (data.success) {
        setBadgesData(data.data)
      } else {
        toast.error('Failed to load badges')
      }
    } catch (error) {
      console.error('Error fetching badges:', error)
      toast.error('Failed to load badges')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || !badgesData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3 mb-2">
            <Award className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">Achievements</h1>
          </div>
          <p className="text-gray-600">
            Track your progress and unlock badges as you grow your business
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading achievements...</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {badgesData.stats.totalSales}
                  </div>
                  <div className="text-sm text-gray-600">Total Sales</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    ${badgesData.stats.totalRevenue.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {badgesData.stats.averageRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {badgesData.stats.totalReviews}
                  </div>
                  <div className="text-sm text-gray-600">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600 mb-1">
                    {badgesData.stats.totalProducts}
                  </div>
                  <div className="text-sm text-gray-600">Products</div>
                </div>
              </div>
            </div>

            {/* Earned Badges */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Earned Badges ({badgesData.earnedBadges.length})
                </h2>
                {badgesData.earnedBadges.length > 0 && (
                  <div className="text-purple-600 font-semibold flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Keep it up!</span>
                  </div>
                )}
              </div>

              {badgesData.earnedBadges.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No badges yet
                  </h3>
                  <p className="text-gray-600">
                    Keep selling and providing great service to earn your first badge!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {badgesData.earnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 transition"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="text-4xl">{badge.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{badge.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                          <SellerBadge badge={badge} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Badges to Earn */}
            {badgesData.nextBadges.length > 0 && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border-2 border-dashed border-gray-300">
                <div className="flex items-center space-x-3 mb-6">
                  <Lock className="w-6 h-6 text-gray-500" />
                  <h2 className="text-2xl font-bold text-gray-900">Next Achievements</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {badgesData.nextBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-white rounded-xl p-6 border-2 border-gray-200 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-2">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="text-4xl opacity-50">{badge.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{badge.name}</h3>
                          <p className="text-sm text-gray-600">{badge.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
