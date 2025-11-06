'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, ShoppingCart, Star, Download, ArrowLeft, Check, Minus } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useComparisonStore } from '@/store/useComparisonStore'
import { useCartStore } from '@/store/useCartStore'
import toast from 'react-hot-toast'
import { formatPrice, formatFileSize } from '@/utils/helpers'

export default function ComparePage() {
  const { items, removeFromComparison, clearComparison } = useComparisonStore()
  const { addToCart } = useCartStore()

  const handleAddToCart = (product: any) => {
    addToCart(product)
    toast.success('Added to cart!')
  }

  const comparisonRows = [
    { label: 'Price', key: 'price' },
    { label: 'Category', key: 'category' },
    { label: 'Seller', key: 'seller' },
    { label: 'Rating', key: 'rating' },
    { label: 'Reviews', key: 'reviews' },
    { label: 'Sales', key: 'sales' },
    { label: 'File Size', key: 'fileSize' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Compare Products
              </h1>
              <p className="text-gray-600">
                Compare up to 4 products side by side ({items.length}/4)
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearComparison}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Products to Compare
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start adding products from the marketplace to compare their features,
              prices, and ratings side by side.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition"
            >
              <span>Browse Products</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-6 font-semibold text-gray-900 bg-gray-50 sticky left-0 z-10">
                      Feature
                    </th>
                    {items.map((product) => (
                      <th key={product.id} className="p-6 min-w-[250px]">
                        <div className="relative">
                          <button
                            onClick={() => removeFromComparison(product.id)}
                            className="absolute top-0 right-0 p-2 text-gray-400 hover:text-red-600 transition"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <Link href={`/products/${product.id}`}>
                            <div className="h-40 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg overflow-hidden mb-4 group">
                              {product.thumbnailUrl ? (
                                <img
                                  src={product.thumbnailUrl}
                                  alt={product.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <div className="text-4xl">📦</div>
                                </div>
                              )}
                            </div>
                          </Link>
                          <Link href={`/products/${product.id}`}>
                            <h3 className="font-semibold text-gray-900 mb-2 hover:text-purple-600 transition line-clamp-2">
                              {product.title}
                            </h3>
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Price Row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                      Price
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="p-6 text-center">
                        {product.discountPrice ? (
                          <div>
                            <div className="text-2xl font-bold text-gray-900">
                              {formatPrice(product.discountPrice)}
                            </div>
                            <div className="text-sm text-gray-400 line-through">
                              {formatPrice(product.price)}
                            </div>
                            <div className="text-xs text-red-600 font-semibold mt-1">
                              {Math.round(
                                ((product.price - product.discountPrice) / product.price) * 100
                              )}
                              % OFF
                            </div>
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-gray-900">
                            {formatPrice(product.price)}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Category Row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                      Category
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="p-6 text-center">
                        <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                          {product.category.name}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Seller Row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                      Seller
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="p-6 text-center">
                        <span className="text-gray-700">
                          {product.seller.username}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Rating Row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                      Rating
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="p-6 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <span className="font-medium text-gray-900">
                            {product.averageRating && product.averageRating > 0
                              ? product.averageRating.toFixed(1)
                              : 'N/A'}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Reviews Row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                      Reviews
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="p-6 text-center">
                        <span className="text-gray-700">
                          {product.reviewCount || 0} reviews
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Sales Row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                      Sales
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="p-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Download className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">
                            {product.downloadCount || 0}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* File Size Row */}
                  {items.some((p) => p.fileSize) && (
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                        File Size
                      </td>
                      {items.map((product) => (
                        <td key={product.id} className="p-6 text-center">
                          <span className="text-gray-700">
                            {product.fileSize
                              ? formatFileSize(product.fileSize)
                              : 'N/A'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Action Row */}
                  <tr>
                    <td className="p-6 font-medium text-gray-900 bg-gray-50 sticky left-0">
                      Action
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="p-6">
                        <div className="space-y-2">
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center space-x-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span>Add to Cart</span>
                          </button>
                          <Link
                            href={`/products/${product.id}`}
                            className="block w-full text-center py-3 border border-gray-300 rounded-lg hover:border-purple-600 hover:text-purple-600 transition font-medium"
                          >
                            View Details
                          </Link>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {items.length > 0 && items.length < 4 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-900 font-medium">
              You can add up to {4 - items.length} more product
              {4 - items.length !== 1 && 's'} to compare
            </p>
            <Link
              href="/marketplace"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-semibold"
            >
              Browse Marketplace →
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
