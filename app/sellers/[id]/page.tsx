'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Package,
  TrendingUp,
  Award,
  Calendar,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/store/useCartStore'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'
import { format } from 'date-fns'

interface Product {
  id: string
  title: string
  description: string
  price: number
  discountPrice?: number
  thumbnailUrl?: string
  averageRating: number
  reviewCount: number
  downloadCount: number
  category: {
    name: string
  }
}

interface SellerData {
  user: {
    id: string
    username: string
    role: string
    subscriptionTier: string
    createdAt: string
  }
  stats: {
    totalSales: number
    totalProducts: number
    totalRevenue: number
    averageRating: number
  }
  products: Product[]
}

export default function SellerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [sellerData, setSellerData] = useState<SellerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addToCart } = useCartStore()

  useEffect(() => {
    if (params.id) {
      fetchSellerData()
    }
  }, [params.id])

  const fetchSellerData = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`)
      const data = await response.json()

      if (data.success) {
        setSellerData(data.data)
      } else {
        toast.error('Seller not found')
        router.push('/marketplace')
      }
    } catch (error) {
      console.error('Error fetching seller:', error)
      toast.error('Failed to load seller profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = (product: Product) => {
    addToCart(product as any)
    toast.success('Added to cart!')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-gray-200 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!sellerData) {
    return null
  }

  const { user, stats, products } = sellerData

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </div>

        {/* Seller Profile Header */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border-4 border-white/30">
                <span className="text-4xl font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-4xl font-bold">{user.username}</h1>
                  {user.subscriptionTier !== 'FREE' && (
                    <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                      {user.subscriptionTier}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-purple-100 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {format(new Date(user.createdAt), 'MMM yyyy')}</span>
                  </div>
                  {stats.averageRating > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{stats.averageRating.toFixed(1)} rating</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5" />
                    <span className="font-semibold">{stats.totalProducts}</span>
                    <span className="text-purple-100">Products</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-semibold">{stats.totalSales}</span>
                    <span className="text-purple-100">Sales</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.totalProducts}
            </div>
            <div className="text-sm text-gray-600">Active Products</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.totalSales}
            </div>
            <div className="text-sm text-gray-600">Total Sales</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {user.subscriptionTier}
            </div>
            <div className="text-sm text-gray-600">Seller Tier</div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Products by {user.username}
          </h2>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition group"
                >
                  <Link href={`/products/${product.id}`}>
                    <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-t-lg overflow-hidden">
                      {product.thumbnailUrl ? (
                        <img
                          src={product.thumbnailUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-6xl">📦</div>
                        </div>
                      )}
                      {product.discountPrice && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                          {Math.round(
                            ((product.price - product.discountPrice) / product.price) * 100
                          )}
                          % OFF
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <div className="text-xs text-purple-600 font-medium mb-1">
                      {product.category.name}
                    </div>

                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-purple-600 transition">
                        {product.title}
                      </h3>
                    </Link>

                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {product.averageRating > 0
                            ? product.averageRating.toFixed(1)
                            : 'New'}
                        </span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">
                        {product.downloadCount} sales
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {product.discountPrice ? (
                          <>
                            <span className="text-lg font-bold text-gray-900">
                              {formatPrice(product.discountPrice)}
                            </span>
                            <span className="text-sm text-gray-400 line-through ml-2">
                              {formatPrice(product.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl shadow">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No products yet
              </h3>
              <p className="text-gray-600">
                This seller hasn't listed any products
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
