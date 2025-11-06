'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package, Plus, DollarSign, TrendingUp, Eye, Download,
  Edit, Trash2, ShoppingBag
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'
import { format } from 'date-fns'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, user, token } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'sales'>('overview')
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalViews: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to access dashboard')
      router.push('/login')
      return
    }

    fetchDashboardData()
  }, [isAuthenticated])

  const fetchDashboardData = async () => {
    try {
      // Fetch seller's products
      const productsRes = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const productsData = await productsRes.json()

      // Fetch seller's sales
      const salesRes = await fetch('/api/orders?type=seller', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const salesData = await salesRes.json()

      if (productsData.success) {
        const userProducts = productsData.data.items
        setProducts(userProducts)

        const totalViews = userProducts.reduce((sum: number, p: any) => sum + p.viewCount, 0)
        const totalDownloads = userProducts.reduce((sum: number, p: any) => sum + p.downloadCount, 0)

        setStats((prev) => ({
          ...prev,
          totalProducts: userProducts.length,
          totalViews,
        }))
      }

      if (salesData.success) {
        const completedOrders = salesData.data.filter((o: any) => o.status === 'COMPLETED')
        setOrders(completedOrders)

        const totalRevenue = completedOrders.reduce(
          (sum: number, o: any) => sum + o.sellerAmount,
          0
        )

        setStats((prev) => ({
          ...prev,
          totalSales: completedOrders.length,
          totalRevenue,
        }))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Product deleted successfully')
        fetchDashboardData()
      } else {
        toast.error(data.error || 'Failed to delete product')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Something went wrong')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Seller Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {user?.username}!
            </p>
          </div>
          <Link
            href="/dashboard/products/new"
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.totalProducts}
            </div>
            <div className="text-sm text-gray-600">Total Products</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.totalSales}
            </div>
            <div className="text-sm text-gray-600">Total Sales</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatPrice(stats.totalRevenue)}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.totalViews}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'overview'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'products'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Products ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'sales'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sales ({orders.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  {orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {order.product.title}
                              </div>
                              <div className="text-sm text-gray-600">
                                Sold to {order.buyer.username}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {formatPrice(order.sellerAmount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No sales yet. Start by adding products!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                {products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.thumbnailUrl ? (
                            <img
                              src={product.thumbnailUrl}
                              alt={product.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-3xl">📦</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 truncate">
                            {product.title}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Download className="w-4 h-4 mr-1" />
                              {product.downloadCount} sales
                            </span>
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {product.viewCount} views
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/products/${product.id}`}
                            className="p-2 text-gray-600 hover:bg-white rounded-lg transition"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-red-600 hover:bg-white rounded-lg transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No products yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Start selling by adding your first product
                    </p>
                    <Link
                      href="/dashboard/products/new"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Product</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && (
              <div>
                {orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                            Product
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                            Buyer
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                            Date
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-gray-100">
                            <td className="py-4 px-4 text-sm text-gray-900">
                              {order.product.title}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              {order.buyer.username}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium">
                              {formatPrice(order.sellerAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No sales yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
