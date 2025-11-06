'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, ShoppingCart, Filter } from 'lucide-react'
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
}

interface Category {
  name: string
  description?: string
  icon?: string
}

export default function CategoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addToCart } = useCartStore()

  useEffect(() => {
    if (params.slug) {
      fetchCategoryProducts()
    }
  }, [params.slug])

  const fetchCategoryProducts = async () => {
    try {
      // Fetch category info from seed data (in production, you'd have a category API)
      const categories: Record<string, Category> = {
        software: {
          name: 'Software & Tools',
          description: 'Software applications, plugins, and development tools',
          icon: '💻',
        },
        'digital-art': {
          name: 'Digital Art',
          description: 'Graphics, illustrations, and digital artwork',
          icon: '🎨',
        },
        templates: {
          name: 'Templates',
          description: 'Website templates, design templates, and themes',
          icon: '📄',
        },
        education: {
          name: 'Education',
          description: 'Online courses, ebooks, and learning materials',
          icon: '📚',
        },
        music: {
          name: 'Music & Audio',
          description: 'Music tracks, sound effects, and audio samples',
          icon: '🎵',
        },
        video: {
          name: 'Video & Animation',
          description: 'Video templates, motion graphics, and animations',
          icon: '🎬',
        },
      }

      setCategory(categories[params.slug as string] || null)

      // Fetch products (would need to filter by category in production)
      const response = await fetch('/api/products')
      const data = await response.json()

      if (data.success) {
        // For demo, show all products. In production, filter by category
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
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

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Category not found
          </h1>
          <Link
            href="/categories"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back to Categories
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/categories"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Categories
          </Link>
        </div>

        {/* Category Header */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl p-12 mb-12 text-white">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <span className="text-5xl">{category.icon}</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-xl text-purple-100">{category.description}</p>
              )}
            </div>
          </div>
          <div className="text-purple-100">
            {products.length} products available
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-8 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {products.length} products
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Filter className="w-4 h-4" />
            <span>Sort & Filter</span>
          </button>
        </div>

        {/* Products Grid */}
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
        ) : (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <Filter className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No products in this category yet
            </h3>
            <p className="text-gray-600 mb-6">
              Check back soon for new products!
            </p>
            <Link
              href="/marketplace"
              className="inline-block bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
