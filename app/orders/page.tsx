'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Package, Clock, CheckCircle, XCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'
import { format } from 'date-fns'

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated, token } = useAuthStore()
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to view orders')
      router.push('/login')
      return
    }

    fetchOrders()
  }, [isAuthenticated])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?type=buyer', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setOrders(data.data)
      } else {
        toast.error('Failed to load orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = (order: any) => {
    if (order.status !== 'COMPLETED') {
      toast.error('Order is not completed yet')
      return
    }

    // In a real app, this would generate a secure download link
    toast.success('Download started!')

    // Simulate download
    const link = document.createElement('a')
    link.href = order.product.fileUrl
    link.download = order.product.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'PROCESSING':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'PENDING':
        return <Clock className="w-5 h-5 text-gray-600" />
      case 'CANCELLED':
      case 'REFUNDED':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Package className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-700'
      case 'PENDING':
        return 'bg-gray-100 text-gray-700'
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Orders</h1>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {order.product.thumbnailUrl ? (
                        <img
                          src={order.product.thumbnailUrl}
                          alt={order.product.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-3xl">📦</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {order.product.title}
                      </h3>
                      <div className="text-sm text-gray-600 mb-2">
                        Order #{order.orderNumber}
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span>Seller: {order.seller.username}</span>
                        <span>•</span>
                        <span>{format(new Date(order.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {formatPrice(order.totalAmount)}
                    </div>
                    <div
                      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      <span>{order.status}</span>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                {order.transactions && order.transactions.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between mb-1">
                        <span>Payment Method:</span>
                        <span className="font-medium text-gray-900">
                          {order.transactions[0].cryptoCurrency} (Crypto)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction Status:</span>
                        <span className="font-medium text-gray-900">
                          {order.transactions[0].status}
                        </span>
                      </div>
                      {order.transactions[0].transactionHash && (
                        <div className="flex justify-between mt-1">
                          <span>Transaction Hash:</span>
                          <span className="font-mono text-xs text-purple-600 truncate ml-2">
                            {order.transactions[0].transactionHash}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3">
                  {order.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleDownload(order)}
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  )}

                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => router.push('/checkout')}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
                    >
                      <span>Complete Payment</span>
                    </button>
                  )}

                  {order.status === 'PROCESSING' && (
                    <div className="text-sm text-gray-600">
                      Processing payment... This may take a few minutes
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No orders yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start shopping to see your orders here
            </p>
            <button
              onClick={() => router.push('/marketplace')}
              className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Browse Products
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
