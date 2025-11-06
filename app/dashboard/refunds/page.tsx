'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'
import { format } from 'date-fns'

interface Refund {
  id: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  sellerResponse?: string
  refundAmount: number
  createdAt: string
  processedAt?: string
  order: {
    orderNumber: string
    product: {
      title: string
    }
    buyer: {
      username: string
    }
  }
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
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
      const response = await fetch('/api/refunds?role=seller')
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

  const handleAction = async (refundId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action,
          sellerResponse: respondingTo === refundId ? responseText : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setRespondingTo(null)
        setResponseText('')
        fetchRefunds()
      } else {
        toast.error(data.error || 'Failed to update refund')
      }
    } catch (error) {
      console.error('Error updating refund:', error)
      toast.error('Failed to update refund')
    }
  }

  const filteredRefunds = refunds.filter((refund) => {
    if (filter === 'all') return true
    return refund.status.toLowerCase() === filter
  })

  const statusConfig = {
    PENDING: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: Clock,
      label: 'Pending',
    },
    APPROVED: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: CheckCircle,
      label: 'Approved',
    },
    REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: XCircle,
      label: 'Rejected',
    },
    COMPLETED: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: CheckCircle,
      label: 'Completed',
    },
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Refund Requests
          </h1>
          <p className="text-gray-600">
            Manage refund requests from your customers
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-6 py-4 font-medium transition ${
                  filter === tab.key
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-sm">
                  ({tab.key === 'all'
                    ? refunds.length
                    : refunds.filter((r) => r.status.toLowerCase() === tab.key).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Refunds List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading refunds...</p>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No refund requests
              </h3>
              <p className="text-gray-600">
                {filter !== 'all'
                  ? `You have no ${filter} refund requests`
                  : 'You have not received any refund requests'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRefunds.map((refund) => {
                const StatusIcon = statusConfig[refund.status].icon
                return (
                  <div key={refund.id} className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {refund.order.product.title}
                          </h3>
                          <div
                            className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[refund.status].bg} ${statusConfig[refund.status].text}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusConfig[refund.status].label}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Order #{refund.order.orderNumber}</span>
                          <span>•</span>
                          <span>Buyer: {refund.order.buyer.username}</span>
                          <span>•</span>
                          <span>{format(new Date(refund.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatPrice(refund.refundAmount)}
                        </div>
                        <div className="text-sm text-gray-500">Refund Amount</div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        Refund Reason:
                      </div>
                      <div className="text-gray-900">{refund.reason}</div>
                    </div>

                    {/* Seller Response (if exists) */}
                    {refund.sellerResponse && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
                        <div className="text-sm font-semibold text-blue-900 mb-2">
                          Your Response:
                        </div>
                        <div className="text-blue-900">{refund.sellerResponse}</div>
                      </div>
                    )}

                    {/* Actions (only for pending refunds) */}
                    {refund.status === 'PENDING' && (
                      <div className="space-y-4">
                        {/* Response Form */}
                        <div>
                          <button
                            onClick={() =>
                              setRespondingTo(
                                respondingTo === refund.id ? null : refund.id
                              )
                            }
                            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>
                              {respondingTo === refund.id
                                ? 'Hide Response'
                                : 'Add Response (Optional)'}
                            </span>
                          </button>

                          {respondingTo === refund.id && (
                            <div className="mt-3">
                              <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none resize-none"
                                rows={3}
                                placeholder="Add a response to explain your decision..."
                              />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleAction(refund.id, 'APPROVED')}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            <span>Approve Refund</span>
                          </button>
                          <button
                            onClick={() => handleAction(refund.id, 'REJECTED')}
                            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center space-x-2"
                          >
                            <XCircle className="w-5 h-5" />
                            <span>Reject Refund</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Processed Info */}
                    {refund.processedAt && (
                      <div className="text-sm text-gray-500 mt-4">
                        Processed on {format(new Date(refund.processedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
