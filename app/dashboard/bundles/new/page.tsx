'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatPrice } from '@/utils/helpers'

interface Product {
  id: string
  title: string
  price: number
  discountPrice?: number
}

export default function NewBundlePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountPercent: '10',
  })

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to create bundles')
      router.push('/login')
      return
    }
    fetchProducts()
  }, [isAuthenticated])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products/seller')
      const data = await response.json()

      if (data.success) {
        setProducts(data.data.filter((p: any) => p.isActive))
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const calculatePricing = () => {
    const selectedProductsData = products.filter((p) =>
      selectedProducts.includes(p.id)
    )
    const totalPrice = selectedProductsData.reduce(
      (sum, p) => sum + (p.discountPrice || p.price),
      0
    )
    const bundlePrice = totalPrice * (1 - parseFloat(formData.discountPercent || '0') / 100)
    const savings = totalPrice - bundlePrice

    return { totalPrice, bundlePrice, savings }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    if (selectedProducts.length < 2) {
      toast.error('Please select at least 2 products for the bundle')
      return
    }

    if (
      !formData.discountPercent ||
      parseFloat(formData.discountPercent) < 0 ||
      parseFloat(formData.discountPercent) > 100
    ) {
      toast.error('Discount percent must be between 0 and 100')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/bundles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          productIds: selectedProducts,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Bundle created successfully!')
        router.push('/dashboard/bundles')
      } else {
        toast.error(data.error || 'Failed to create bundle')
      }
    } catch (error) {
      console.error('Create bundle error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const pricing = calculatePricing()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/bundles"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bundles
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Product Bundle
          </h1>
          <p className="text-gray-600">
            Bundle multiple products together at a discounted price
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bundle Details */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Bundle Details</h2>

            <div className="space-y-4">
              {/* Bundle Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundle Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="Ultimate Starter Pack"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none resize-none"
                  rows={4}
                  placeholder="Describe what's included in this bundle and why buyers should choose it..."
                  required
                />
              </div>

              {/* Discount Percent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundle Discount (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, discountPercent: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="10"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Discount applied to the total price of all products
                </p>
              </div>
            </div>
          </div>

          {/* Select Products */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Select Products ({selectedProducts.length} selected)
            </h2>

            {products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>You need at least 2 active products to create a bundle.</p>
                <Link
                  href="/dashboard/products/new"
                  className="text-purple-600 hover:text-purple-700 font-medium mt-2 inline-block"
                >
                  Create a product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedProducts.includes(product.id)
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {product.title}
                        </h3>
                        <div className="text-sm text-gray-700">
                          {formatPrice(product.discountPrice || product.price)}
                          {product.discountPrice && (
                            <span className="text-gray-400 line-through ml-2">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedProducts.includes(product.id) && (
                        <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          {selectedProducts.length >= 2 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-xl p-8 border border-purple-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Pricing Summary
              </h2>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-700">Regular Total Price:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatPrice(pricing.totalPrice)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-700">
                    Bundle Discount ({formData.discountPercent}%):
                  </span>
                  <span className="text-lg font-semibold text-red-600">
                    -{formatPrice(pricing.savings)}
                  </span>
                </div>
                <div className="border-t border-purple-200 pt-3 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    Bundle Price:
                  </span>
                  <span className="text-3xl font-bold text-purple-600">
                    {formatPrice(pricing.bundlePrice)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Customers save {formatPrice(pricing.savings)} when buying this bundle!
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              disabled={isLoading || selectedProducts.length < 2}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Bundle...' : 'Create Bundle'}
            </button>
            <Link
              href="/dashboard/bundles"
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  )
}
