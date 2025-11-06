'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Star, Download, Shield, Zap, User } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import { formatPrice, formatFileSize } from '@/utils/helpers'
import { format } from 'date-fns'

interface Review {
  id: string
  rating: number
  comment?: string
  isVerified: boolean
  createdAt: string
  user: {
    username: string
  }
}

interface Product {
  id: string
  title: string
  description: string
  shortDescription?: string
  price: number
  discountPrice?: number
  thumbnailUrl?: string
  demoUrl?: string
  fileName: string
  fileSize: number
  downloadCount: number
  viewCount: number
  averageRating: number
  createdAt: string
  seller: {
    id: string
    username: string
    createdAt: string
  }
  category: {
    id: string
    name: string
    slug: string
  }
  reviews: Review[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addToCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`)
      const data = await response.json()

      if (data.success) {
        setProduct(data.data)
      } else {
        toast.error('Product not found')
        router.push('/marketplace')
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('Failed to load product')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return
    addToCart(product as any)
    toast.success('Added to cart!')
  }

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error('Please login to purchase')
      router.push('/login')
      return
    }
    if (!product) return
    addToCart(product as any)
    router.push('/cart')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-24 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return null
  }

  const finalPrice = product.discountPrice || product.price

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link href="/marketplace" className="hover:text-purple-600 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Marketplace
          </Link>
          <span>/</span>
          <span>{product.category.name}</span>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Image */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              {product.thumbnailUrl ? (
                <img
                  src={product.thumbnailUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-9xl">📦</div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="text-sm text-purple-600 font-medium mb-2">
                {product.category.name}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {product.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(product.averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">
                  {product.averageRating > 0
                    ? `${product.averageRating} (${product.reviews.length} reviews)`
                    : 'No reviews yet'}
                </span>
              </div>

              {/* Seller */}
              <div className="flex items-center space-x-2 text-gray-600 mb-6">
                <User className="w-4 h-4" />
                <span>by</span>
                <Link
                  href={`/sellers/${product.seller.id}`}
                  className="text-purple-600 font-medium hover:text-purple-700"
                >
                  {product.seller.username}
                </Link>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-baseline space-x-3 mb-4">
                  {product.discountPrice ? (
                    <>
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(product.discountPrice)}
                      </span>
                      <span className="text-2xl text-gray-400 line-through">
                        {formatPrice(product.price)}
                      </span>
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {Math.round(
                          ((product.price - product.discountPrice) / product.price) * 100
                        )}
                        % OFF
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleBuyNow}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-4 rounded-lg font-semibold hover:opacity-90 transition"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-white text-gray-900 py-4 rounded-lg font-semibold border-2 border-gray-300 hover:border-purple-600 transition flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Download className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900">
                    {product.downloadCount}
                  </div>
                  <div className="text-xs text-gray-600">Downloads</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Zap className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900">Instant</div>
                  <div className="text-xs text-gray-600">Delivery</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Shield className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900">Secure</div>
                  <div className="text-xs text-gray-600">Payment</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Description
              </h2>
              <div className="prose prose-purple max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Reviews ({product.reviews.length})
              </h2>

              {product.reviews.length > 0 ? (
                <div className="space-y-6">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {review.user.username}
                              {review.isVerified && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  Verified Purchase
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No reviews yet. Be the first to review this product!
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Product Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">Product Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size</span>
                  <span className="font-medium text-gray-900">
                    {formatFileSize(product.fileSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File Name</span>
                  <span className="font-medium text-gray-900 truncate ml-2">
                    {product.fileName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Downloads</span>
                  <span className="font-medium text-gray-900">
                    {product.downloadCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Views</span>
                  <span className="font-medium text-gray-900">
                    {product.viewCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Added</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(product.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">About the Seller</h3>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {product.seller.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {product.seller.username}
                  </div>
                  <div className="text-sm text-gray-500">
                    Member since {format(new Date(product.seller.createdAt), 'MMM yyyy')}
                  </div>
                </div>
              </div>
              <Link
                href={`/sellers/${product.seller.id}`}
                className="block w-full text-center py-2 border border-gray-300 rounded-lg hover:border-purple-600 hover:text-purple-600 transition"
              >
                View Profile
              </Link>
            </div>

            {/* Security Badge */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
              <Shield className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Secure Purchase</h3>
              <p className="text-sm text-gray-600">
                All transactions are encrypted and protected. Pay with cryptocurrency for maximum privacy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
