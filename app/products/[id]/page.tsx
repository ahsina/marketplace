'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Star, Download, Shield, Zap, User, ThumbsUp, ThumbsDown } from 'lucide-react'
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
  _count?: {
    votes: number
  }
  votes?: {
    isHelpful: boolean
  }[]
  helpfulCount?: number
  notHelpfulCount?: number
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
  tags?: string
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
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewVotes, setReviewVotes] = useState<Record<string, { helpfulCount: number; notHelpfulCount: number; userVote: boolean | null }>>({})
  const { addToCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (params.id) {
      fetchProduct()
      fetchRelatedProducts()
      trackView()
    }
  }, [params.id])

  useEffect(() => {
    // Fetch vote counts for all reviews when product is loaded
    if (product?.reviews) {
      product.reviews.forEach(review => {
        fetchReviewVotes(review.id)
      })
    }
  }, [product?.reviews.length])

  const trackView = async () => {
    try {
      await fetch(`/api/products/${params.id}/view`, {
        method: 'POST',
      })
    } catch (error) {
      // Silently fail - view tracking is not critical
      console.error('Error tracking view:', error)
    }
  }

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

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}/related`)
      const data = await response.json()

      if (data.success) {
        setRelatedProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching related products:', error)
    }
  }

  const fetchReviewVotes = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/vote`)
      const data = await response.json()

      if (data.success) {
        setReviewVotes(prev => ({
          ...prev,
          [reviewId]: {
            helpfulCount: data.data.helpfulCount,
            notHelpfulCount: data.data.notHelpfulCount,
            userVote: data.data.userVote,
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching review votes:', error)
    }
  }

  const handleVote = async (reviewId: string, isHelpful: boolean) => {
    if (!isAuthenticated) {
      toast.error('Please login to vote on reviews')
      return
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isHelpful }),
      })

      const data = await response.json()

      if (data.success) {
        setReviewVotes(prev => ({
          ...prev,
          [reviewId]: {
            helpfulCount: data.data.helpfulCount,
            notHelpfulCount: data.data.notHelpfulCount,
            userVote: isHelpful,
          }
        }))
        toast.success('Thank you for your feedback!')
      } else {
        toast.error(data.error || 'Failed to vote')
      }
    } catch (error) {
      console.error('Error voting on review:', error)
      toast.error('Failed to vote')
    }
  }

  const handleAddToCart = (prod?: any) => {
    const productToAdd = prod || product
    if (!productToAdd) return
    addToCart(productToAdd as any)
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

              {/* Tags */}
              {product.tags && (() => {
                try {
                  const tags = JSON.parse(product.tags)
                  if (Array.isArray(tags) && tags.length > 0) {
                    return (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag: string, index: number) => (
                            <Link
                              key={index}
                              href={`/marketplace?search=${encodeURIComponent(tag)}`}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
                            >
                              #{tag}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  }
                } catch (e) {
                  return null
                }
                return null
              })()}
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Reviews ({product.reviews.length})
              </h2>

              {product.reviews.length > 0 ? (
                <div className="space-y-6">
                  {product.reviews.map((review) => {
                    const voteData = reviewVotes[review.id]
                    const helpfulCount = voteData?.helpfulCount || 0
                    const notHelpfulCount = voteData?.notHelpfulCount || 0
                    const userVote = voteData?.userVote

                    return (
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
                          <p className="text-gray-700 mb-4">{review.comment}</p>
                        )}

                        {/* Vote Buttons */}
                        <div className="flex items-center space-x-4 mt-3">
                          <span className="text-sm text-gray-600">Was this review helpful?</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleVote(review.id, true)}
                              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                userVote === true
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span>{helpfulCount}</span>
                            </button>
                            <button
                              onClick={() => handleVote(review.id, false)}
                              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                userVote === false
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <ThumbsDown className="w-4 h-4" />
                              <span>{notHelpfulCount}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Related Products
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition group"
                >
                  <Link href={`/products/${relatedProduct.id}`}>
                    <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-t-lg overflow-hidden">
                      {relatedProduct.thumbnailUrl ? (
                        <img
                          src={relatedProduct.thumbnailUrl}
                          alt={relatedProduct.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-6xl">📦</div>
                        </div>
                      )}
                      {relatedProduct.discountPrice && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                          {Math.round(
                            ((relatedProduct.price - relatedProduct.discountPrice) /
                              relatedProduct.price) *
                              100
                          )}
                          % OFF
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <div className="text-xs text-purple-600 font-medium mb-1">
                      {relatedProduct.category.name}
                    </div>

                    <Link href={`/products/${relatedProduct.id}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-purple-600 transition">
                        {relatedProduct.title}
                      </h3>
                    </Link>

                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {relatedProduct.averageRating > 0
                            ? relatedProduct.averageRating.toFixed(1)
                            : 'New'}
                        </span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">
                        {relatedProduct.downloadCount} sales
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {relatedProduct.discountPrice ? (
                          <>
                            <span className="text-lg font-bold text-gray-900">
                              {formatPrice(relatedProduct.discountPrice)}
                            </span>
                            <span className="text-sm text-gray-400 line-through ml-2">
                              {formatPrice(relatedProduct.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(relatedProduct.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(relatedProduct)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
