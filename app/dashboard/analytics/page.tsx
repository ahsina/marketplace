'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Eye, Download, Star, Calendar } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'

interface Analytics {
  summary: {
    totalRevenue: number
    totalOrders: number
    totalViews: number
    totalDownloads: number
    avgOrderValue: number
    avgRating: number
    totalProducts: number
  }
  revenueData: Array<{
    date: string
    revenue: number
    orders: number
  }>
  productPerformance: Array<{
    id: string
    title: string
    revenue: number
    orders: number
    views: number
    downloads: number
    conversionRate: string
    rating: number
  }>
  ordersByStatus: {
    PENDING: number
    PROCESSING: number
    COMPLETED: number
    CANCELLED: number
    REFUNDED: number
  }
  period: number
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState('30')
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchAnalytics()
  }, [isAuthenticated, period])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/seller/analytics?period=${period}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.data)
      } else {
        toast.error('Failed to load analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || !analytics) {
    return null
  }

  const maxRevenue = Math.max(...analytics.revenueData.map((d) => d.revenue), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics</h1>
              <p className="text-gray-600">
                Detailed insights into your sales performance
              </p>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(analytics.summary.totalRevenue)}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {analytics.summary.totalOrders}
                </div>
                <div className="text-sm text-gray-600">Total Orders</div>
                <div className="text-xs text-gray-500 mt-2">
                  Avg: {formatPrice(analytics.summary.avgOrderValue)}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {analytics.summary.totalViews.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Views</div>
                <div className="text-xs text-gray-500 mt-2">
                  {analytics.summary.totalDownloads} downloads
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {analytics.summary.avgRating.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Average Rating</div>
                <div className="text-xs text-gray-500 mt-2">
                  {analytics.summary.totalProducts} products
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Revenue Over Time</h2>
              {analytics.revenueData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No revenue data for this period
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.revenueData.slice(-14).map((day, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-24 text-sm text-gray-600 flex-shrink-0">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex-1">
                        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg transition-all duration-500"
                            style={{
                              width: `${(day.revenue / maxRevenue) * 100}%`,
                            }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className="text-sm font-medium text-gray-900">
                              {formatPrice(day.revenue)}
                            </span>
                            <span className="text-xs text-gray-600 ml-2">
                              ({day.orders} {day.orders === 1 ? 'order' : 'orders'})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Performance */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Top Performing Products
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Product
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Revenue
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Orders
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Views
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Conv. Rate
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.productPerformance.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/products/${product.id}`}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                          >
                            {product.title}
                          </Link>
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-gray-900">
                          {formatPrice(product.revenue)}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          {product.orders}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          {product.views}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          {product.conversionRate}%
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-gray-700">{product.rating || 'N/A'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-700 mb-1">
                    {analytics.ordersByStatus.PENDING}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-700 mb-1">
                    {analytics.ordersByStatus.PROCESSING}
                  </div>
                  <div className="text-sm text-gray-600">Processing</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    {analytics.ordersByStatus.COMPLETED}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-700 mb-1">
                    {analytics.ordersByStatus.CANCELLED}
                  </div>
                  <div className="text-sm text-gray-600">Cancelled</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-700 mb-1">
                    {analytics.ordersByStatus.REFUNDED}
                  </div>
                  <div className="text-sm text-gray-600">Refunded</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
