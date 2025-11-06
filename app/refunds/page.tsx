'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'
import { format } from 'date-fns'
import Link from 'next/link'

interface Refund {
  id: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  sellerResponse?: string
  refundAmount: number
  createdAt: string
  processedAt?: string
  order: {
    id: string
    orderNumber: string
    product: {
      title: string
    }
    seller: {
      username: string
    }
  }
}

export default function BuyerRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchRefunds()
  }, [isAuthenticated])

  const fetchRefunds = async () => {
    try {
      const response = await fetch('/api/refunds?role=buyer')
      const data = await response.json()

      if (data.success) {
        setRefunds(data.data)
      }
    } catch (error) {
      console.error('Error fetching refunds:', error)
      toast.error('Failed to load refunds')
    } finally {
      setIsLoading(false)
    }
  }

  const cancelRefund = async (refundId: string) => {
    if (!confirm('Are you sure you want to cancel this refund request?')) return

    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Refund request cancelled')
        fetchRefunds()
      } else {
        toast.error(data.error || 'Failed to cancel refund')
      }
    } catch (error) {
      console.error('Error cancelling refund:', error)
      toast.error('Failed to cancel refund')
    }
  }

  const statusConfig = {
    PENDING: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: Clock,
      label: 'Pending Review',
      description: 'The seller is reviewing your refund request',
    },
    APPROVED: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: CheckCircle,
      label: 'Approved',
      description: 'Your refund has been approved and will be processed',
    },
    REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: XCircle,
      label: 'Rejected',
      description: 'Your refund request was rejected by the seller',
    },
    COMPLETED: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: CheckCircle,
      label: 'Completed',
      description: 'Your refund has been completed',
    },
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Refunds</h1>
          <p className="text-gray-600">
            Track the status of your refund requests
          </p>
        </div>

        {/* Refunds List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading refunds...</p>
            </div>
          ) : refunds.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No refund requests
              </h3>
              <p className="text-gray-600 mb-6">
                You haven't requested any refunds yet
              </p>
              <Link
                href="/orders"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                View Orders
              </Link>
            </div>
          ) : (
            refunds.map((refund) => {
              const StatusIcon = statusConfig[refund.status].icon
              return (
                <div
                  key={refund.id}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {refund.order.product.title}
                      </h3>
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span>Order #{refund.order.orderNumber}</span>
                        <span>•</span>
                        <span>Seller: {refund.order.seller.username}</span>
                      </div>
                    </div>
                    <div
                      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold ${statusConfig[refund.status].bg} ${statusConfig[refund.status].text}`}
                    >
                      <StatusIcon className="w-4 h-4" />
                      <span>{statusConfig[refund.status].label}</span>
                    </div>
                  </div>

                  {/* Status Description */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700">
                      {statusConfig[refund.status].description}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Refund Amount</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPrice(refund.refundAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Requested On</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {format(new Date(refund.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>

                  {/* Your Reason */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      Your Reason:
                    </div>
                    <div className="text-gray-900">{refund.reason}</div>
                  </div>

                  {/* Seller Response */}
                  {refund.sellerResponse && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
                      <div className="text-sm font-semibold text-blue-900 mb-2">
                        Seller's Response:
                      </div>
                      <div className="text-blue-900">{refund.sellerResponse}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                    <Link
                      href={`/orders/${refund.order.id}`}
                      className="flex-1 text-center px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      View Order
                    </Link>
                    {refund.status === 'PENDING' && (
                      <button
                        onClick={() => cancelRefund(refund.id)}
                        className="px-6 py-3 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Cancel Request</span>
                      </button>
                    )}
                  </div>

                  {/* Processed Date */}
                  {refund.processedAt && (
                    <div className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                      Processed on {format(new Date(refund.processedAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
