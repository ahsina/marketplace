'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Edit, Trash2, Package, Eye, EyeOff } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'

interface Product {
  id: string
  title: string
  price: number
  discountPrice?: number
}

interface Bundle {
  id: string
  name: string
  description: string
  price: number
  discountPercent: number
  isActive: boolean
  salesCount: number
  createdAt: string
  products: Product[]
  totalPrice: number
  savings: number
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchBundles()
  }, [isAuthenticated])

  const fetchBundles = async () => {
    try {
      const response = await fetch('/api/bundles')
      const data = await response.json()

      if (data.success) {
        setBundles(data.data)
      }
    } catch (error) {
      console.error('Error fetching bundles:', error)
      toast.error('Failed to load bundles')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleActive = async (bundleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(isActive ? 'Bundle deactivated' : 'Bundle activated')
        fetchBundles()
      } else {
        toast.error(data.error || 'Failed to update bundle')
      }
    } catch (error) {
      console.error('Error updating bundle:', error)
      toast.error('Failed to update bundle')
    }
  }

  const deleteBundle = async (bundleId: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return

    try {
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Bundle deleted successfully')
        fetchBundles()
      } else {
        toast.error(data.error || 'Failed to delete bundle')
      }
    } catch (error) {
      console.error('Error deleting bundle:', error)
      toast.error('Failed to delete bundle')
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Product Bundles
            </h1>
            <p className="text-gray-600">
              Create bundles to sell multiple products together at a discounted price
            </p>
          </div>
          <Link
            href="/dashboard/bundles/new"
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Bundle</span>
          </Link>
        </div>

        {/* Bundles List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bundles...</p>
            </div>
          ) : bundles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No bundles yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first bundle to increase sales
              </p>
              <Link
                href="/dashboard/bundles/new"
                className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Create Bundle</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {bundle.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {bundle.description}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActive(bundle.id, bundle.isActive)}
                      className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${
                        bundle.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {bundle.isActive ? (
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <EyeOff className="w-3 h-3" />
                          <span>Inactive</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Products */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {bundle.products.length} products included
                      </span>
                    </div>
                    <div className="space-y-1">
                      {bundle.products.slice(0, 3).map((product) => (
                        <div key={product.id} className="text-xs text-gray-600 truncate">
                          • {product.title}
                        </div>
                      ))}
                      {bundle.products.length > 3 && (
                        <div className="text-xs text-gray-500">
                          + {bundle.products.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm text-gray-600">Bundle Price:</span>
                      <span className="text-2xl font-bold text-purple-600">
                        {formatPrice(bundle.price)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm text-gray-500">Regular Price:</span>
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(bundle.totalPrice)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-green-600">You Save:</span>
                      <span className="text-sm font-bold text-green-600">
                        {formatPrice(bundle.savings)} ({bundle.discountPercent}%)
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{bundle.salesCount}</span> sales
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => deleteBundle(bundle.id)}
                      className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
