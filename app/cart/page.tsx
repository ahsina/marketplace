'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ShoppingBag, ArrowRight, Lock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import { formatPrice, calculatePlatformFee } from '@/utils/helpers'

export default function CartPage() {
  const router = useRouter()
  const { items, removeFromCart, clearCart, getTotalPrice } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(false)

  const subtotal = getTotalPrice()
  const platformFee = calculatePlatformFee(subtotal)
  const total = subtotal

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue')
      router.push('/login')
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setIsProcessing(true)
    // Redirect to checkout page
    router.push('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h1>
            <p className="text-gray-600 mb-8">
              Discover amazing digital products in our marketplace
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
            >
              <span>Browse Products</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow p-6 flex items-center space-x-6"
              >
                {/* Thumbnail */}
                <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      📦
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition block mb-1 truncate"
                  >
                    {item.title}
                  </Link>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {item.shortDescription || item.description}
                  </p>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(item.discountPrice || item.price)}
                    </span>
                    {item.discountPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => {
                    removeFromCart(item.id)
                    toast.success('Removed from cart')
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            <button
              onClick={() => {
                clearCart()
                toast.success('Cart cleared')
              }}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center">
                    Platform Fee (5%)
                    <span className="ml-1 text-xs text-gray-400">(included)</span>
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(platformFee)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-4 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Lock className="w-5 h-5" />
                <span>{isProcessing ? 'Processing...' : 'Proceed to Checkout'}</span>
              </button>

              <div className="mt-6 space-y-3">
                <div className="flex items-start space-x-3 text-sm text-gray-600">
                  <Lock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">Secure Payment</div>
                    <div className="text-xs">
                      All transactions are encrypted and secure
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-sm text-gray-600">
                  <ShoppingBag className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">Instant Delivery</div>
                    <div className="text-xs">
                      Download immediately after payment
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                  By proceeding to checkout, you agree to our{' '}
                  <Link href="/terms" className="text-purple-600 hover:text-purple-700">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
