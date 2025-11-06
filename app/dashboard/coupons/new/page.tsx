'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function NewCouponPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    expiresAt: '',
    productId: '',
  })

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to create coupons')
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
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code || !formData.value) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate percentage value
    if (formData.type === 'PERCENTAGE' && parseFloat(formData.value) > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Coupon created successfully!')
        router.push('/dashboard/coupons')
      } else {
        toast.error(data.error || 'Failed to create coupon')
      }
    } catch (error) {
      console.error('Create coupon error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/coupons"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Coupons
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Discount Coupon
          </h1>
          <p className="text-gray-600">
            Set up a promotional code for your products
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Coupon Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none uppercase font-mono"
              placeholder="SAVE20"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Use uppercase letters and numbers (e.g., SUMMER2024)
            </p>
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Type *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'PERCENTAGE' })}
                className={`px-4 py-3 border-2 rounded-lg font-medium transition ${
                  formData.type === 'PERCENTAGE'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'FIXED_AMOUNT' })}
                className={`px-4 py-3 border-2 rounded-lg font-medium transition ${
                  formData.type === 'FIXED_AMOUNT'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Fixed Amount ($)
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Value *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max={formData.type === 'PERCENTAGE' ? '100' : undefined}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                placeholder={formData.type === 'PERCENTAGE' ? '20' : '10.00'}
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                {formData.type === 'PERCENTAGE' ? '%' : '$'}
              </div>
            </div>
          </div>

          {/* Optional Settings */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Optional Settings
            </h3>

            <div className="space-y-4">
              {/* Minimum Purchase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Purchase Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minPurchase}
                  onChange={(e) =>
                    setFormData({ ...formData, minPurchase: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="50.00"
                />
              </div>

              {/* Max Discount (for percentage only) */}
              {formData.type === 'PERCENTAGE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Discount Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscount}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscount: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                    placeholder="100.00"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Cap the maximum discount for percentage-based coupons
                  </p>
                </div>
              )}

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty for unlimited uses
                </p>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty for no expiry date
                </p>
              </div>

              {/* Specific Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apply to Specific Product (Optional)
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) =>
                    setFormData({ ...formData, productId: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                >
                  <option value="">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Leave as "All products" to apply coupon to any product
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center space-x-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Coupon...' : 'Create Coupon'}
            </button>
            <Link
              href="/dashboard/coupons"
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
