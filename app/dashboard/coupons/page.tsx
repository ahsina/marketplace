'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Copy, CheckCircle, XCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Coupon {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  minPurchase?: number
  maxDiscount?: number
  usageLimit?: number
  usageCount: number
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchCoupons()
  }, [isAuthenticated])

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/coupons')
      const data = await response.json()

      if (data.success) {
        setCoupons(data.data)
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
      toast.error('Failed to load coupons')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleActive = async (couponId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(isActive ? 'Coupon deactivated' : 'Coupon activated')
        fetchCoupons()
      } else {
        toast.error(data.error || 'Failed to update coupon')
      }
    } catch (error) {
      console.error('Error updating coupon:', error)
      toast.error('Failed to update coupon')
    }
  }

  const deleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return

    try {
      const response = await fetch(`/api/coupons/${couponId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Coupon deleted successfully')
        fetchCoupons()
      } else {
        toast.error(data.error || 'Failed to delete coupon')
      }
    } catch (error) {
      console.error('Error deleting coupon:', error)
      toast.error('Failed to delete coupon')
    }
  }

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Coupon code copied to clipboard!')
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
              Discount Coupons
            </h1>
            <p className="text-gray-600">
              Create and manage promotional codes for your products
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/coupons/new')}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Coupon</span>
          </button>
        </div>

        {/* Coupons List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading coupons...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🎟️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No coupons yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first discount coupon to boost sales
              </p>
              <button
                onClick={() => router.push('/dashboard/coupons/new')}
                className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Create Coupon</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <code className="px-3 py-1 bg-purple-100 text-purple-700 rounded font-mono font-semibold">
                            {coupon.code}
                          </code>
                          <button
                            onClick={() => copyCouponCode(coupon.code)}
                            className="text-gray-400 hover:text-gray-600 transition"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {coupon.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {coupon.type === 'PERCENTAGE'
                            ? `${coupon.value}%`
                            : `$${coupon.value}`}
                        </span>
                        {coupon.maxDiscount && (
                          <div className="text-xs text-gray-500">
                            Max: ${coupon.maxDiscount}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {coupon.usageCount}
                          {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {coupon.expiresAt
                            ? format(new Date(coupon.expiresAt), 'MMM dd, yyyy')
                            : 'No expiry'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive(coupon.id, coupon.isActive)}
                          className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            coupon.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {coupon.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => deleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
