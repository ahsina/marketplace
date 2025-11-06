'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Star, ShoppingCart } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/store/useCartStore'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'

interface Product {
  id: string
  title: string
  description: string
  shortDescription?: string
  price: number
  discountPrice?: number
  thumbnailUrl?: string
  averageRating: number
  reviewCount: number
  downloadCount: number
  seller: {
    username: string
  }
  category: {
    name: string
    slug: string
  }
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { addToCart } = useCartStore()

  useEffect(() => {
    fetchProducts()
  }, [searchTerm])

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()

      if (data.success) {
        setProducts(data.data.items)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = (product: Product) => {
    addToCart(product as any)
    toast.success('Added to cart!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Digital Marketplace
          </h1>
          <p className="text-gray-600">
            Discover thousands of digital products from verified sellers
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for digital products..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
              />
            </div>
            <button className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow animate-pulse"
              >
                <div className="h-48 bg-gray-200 rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
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

                  <div className="mt-2 text-xs text-gray-500 text-center">
                    by {product.seller.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
