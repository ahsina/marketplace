'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Star, ShoppingCart, X, SlidersHorizontal } from 'lucide-react'
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
    id: string
    name: string
    slug: string
  }
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [order, setOrder] = useState('desc')

  const { addToCart } = useCartStore()

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [searchTerm, selectedCategories, minPrice, maxPrice, minRating, sortBy, order])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (minPrice) params.append('minPrice', minPrice)
      if (maxPrice) params.append('maxPrice', maxPrice)
      if (minRating) params.append('minRating', minRating)
      if (sortBy) params.append('sortBy', sortBy)
      if (order) params.append('order', order)

      // Fetch products for each selected category
      if (selectedCategories.length > 0) {
        params.append('categoryId', selectedCategories[0])
      }

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()

      if (data.success) {
        let allProducts = data.data.items

        // Filter by multiple categories if needed
        if (selectedCategories.length > 1) {
          allProducts = allProducts.filter((p: Product) =>
            selectedCategories.includes(p.category.id)
          )
        }

        setProducts(allProducts)
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

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setMinPrice('')
    setMaxPrice('')
    setMinRating('')
    setSortBy('createdAt')
    setOrder('desc')
  }

  const hasActiveFilters =
    selectedCategories.length > 0 || minPrice || maxPrice || minRating

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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-6 py-3 border rounded-lg transition ${
                showFilters || hasActiveFilters
                  ? 'border-purple-600 bg-purple-50 text-purple-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {selectedCategories.length +
                    (minPrice ? 1 : 0) +
                    (maxPrice ? 1 : 0) +
                    (minRating ? 1 : 0)}
                </span>
              )}
            </button>
            <select
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [newSortBy, newOrder] = e.target.value.split('-')
                setSortBy(newSortBy)
                setOrder(newOrder)
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
            >
              <option value="createdAt-desc">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Highest Rated</option>
              <option value="downloads-desc">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Filters Sidebar */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Categories */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Min Price</label>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="$0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Max Price</label>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Any"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Minimum Rating</h4>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map((rating) => (
                    <label
                      key={rating}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating.toString()}
                        onChange={() => setMinRating(rating.toString())}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600"
                      />
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-700">& Up</span>
                      </div>
                    </label>
                  ))}
                  {minRating && (
                    <button
                      onClick={() => setMinRating('')}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      Clear rating filter
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filters Summary */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Active Filters</h4>
                <div className="space-y-2">
                  {selectedCategories.map((catId) => {
                    const category = categories.find((c) => c.id === catId)
                    return (
                      <div
                        key={catId}
                        className="flex items-center justify-between bg-purple-50 px-3 py-1 rounded-lg"
                      >
                        <span className="text-sm text-purple-900">{category?.name}</span>
                        <button
                          onClick={() => toggleCategory(catId)}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  {minPrice && (
                    <div className="flex items-center justify-between bg-purple-50 px-3 py-1 rounded-lg">
                      <span className="text-sm text-purple-900">Min: ${minPrice}</span>
                      <button
                        onClick={() => setMinPrice('')}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {maxPrice && (
                    <div className="flex items-center justify-between bg-purple-50 px-3 py-1 rounded-lg">
                      <span className="text-sm text-purple-900">Max: ${maxPrice}</span>
                      <button
                        onClick={() => setMaxPrice('')}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {minRating && (
                    <div className="flex items-center justify-between bg-purple-50 px-3 py-1 rounded-lg">
                      <span className="text-sm text-purple-900">{minRating}+ Stars</span>
                      <button
                        onClick={() => setMinRating('')}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!hasActiveFilters && (
                    <p className="text-sm text-gray-500">No filters applied</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
