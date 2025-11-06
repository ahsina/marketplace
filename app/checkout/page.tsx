'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bitcoin, Copy, Check, Lock, AlertCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'

const CRYPTO_OPTIONS = [
  { code: 'BTC', name: 'Bitcoin', icon: '₿' },
  { code: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { code: 'USDT', name: 'Tether', icon: '₮' },
  { code: 'USDC', name: 'USD Coin', icon: '$' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart, getTotalPrice } = useCartStore()
  const { isAuthenticated, token } = useAuthStore()
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select')
  const [selectedCrypto, setSelectedCrypto] = useState('BTC')
  const [paymentData, setPaymentData] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to continue')
      router.push('/login')
    }

    if (items.length === 0) {
      router.push('/marketplace')
    }
  }, [isAuthenticated, items])

  const totalAmount = getTotalPrice()

  const handleCreateOrders = async () => {
    setIsProcessing(true)

    try {
      // Create orders
      const ordersResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productIds: items.map((item) => item.id),
        }),
      })

      const ordersData = await ordersResponse.json()

      if (!ordersData.success) {
        toast.error(ordersData.error || 'Failed to create orders')
        return
      }

      // Create payment request
      const paymentResponse = await fetch('/api/payments/crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderIds: ordersData.data.orders.map((o: any) => o.id),
          cryptoCurrency: selectedCrypto,
        }),
      })

      const paymentData = await paymentResponse.json()

      if (!paymentData.success) {
        toast.error(paymentData.error || 'Failed to create payment')
        return
      }

      setPaymentData(paymentData.data)
      setStep('payment')
      toast.success('Payment request created!')
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCompletePayment = () => {
    // In a real app, this would verify the payment via webhook
    // For demo, we'll simulate successful payment
    clearCart()
    setStep('success')
    toast.success('Payment received! Processing your order...')

    // Simulate payment confirmation
    setTimeout(() => {
      toast.success('Order completed! Check your downloads.')
    }, 2000)
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-8">
              Your order has been completed. You can now download your products.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/orders')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                View Orders
              </button>
              <button
                onClick={() => router.push('/marketplace')}
                className="w-full bg-white text-gray-900 py-3 rounded-lg font-semibold border-2 border-gray-300 hover:border-purple-600 transition"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (step === 'payment' && paymentData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bitcoin className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Complete Payment
              </h1>
              <p className="text-gray-600">
                Send exactly <span className="font-bold">{paymentData.cryptoAmount.toFixed(8)} {paymentData.cryptoCurrency}</span> to the address below
              </p>
            </div>

            {/* Payment Amount */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6 text-center border border-purple-100">
              <div className="text-sm text-gray-600 mb-2">Amount to pay</div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {paymentData.cryptoAmount.toFixed(8)} {paymentData.cryptoCurrency}
              </div>
              <div className="text-lg text-gray-600">
                ≈ {formatPrice(paymentData.totalAmount)}
              </div>
            </div>

            {/* Wallet Address */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Address
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={paymentData.walletAddress}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(paymentData.walletAddress)}
                  className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="mb-6">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-8 flex items-center justify-center">
                <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">QR Code Placeholder</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Send only {paymentData.cryptoCurrency} to this address</li>
                    <li>Sending other cryptocurrencies will result in loss of funds</li>
                    <li>Payment will be confirmed after 1 blockchain confirmation</li>
                    <li>This payment link expires in 30 minutes</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCompletePayment}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-4 rounded-lg font-semibold hover:opacity-90 transition"
              >
                I've Sent the Payment
              </button>
              <button
                onClick={() => router.push('/marketplace')}
                className="w-full bg-white text-gray-900 py-3 rounded-lg font-semibold border-2 border-gray-300 hover:border-purple-600 transition"
              >
                Cancel Payment
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              <Lock className="w-4 h-4 inline mr-1" />
              Your payment is secure and encrypted
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Checkout</h1>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.title}</div>
                  <div className="text-sm text-gray-600">
                    {formatPrice(item.discountPrice || item.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-xl font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Crypto Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Select Cryptocurrency
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {CRYPTO_OPTIONS.map((crypto) => (
              <button
                key={crypto.code}
                onClick={() => setSelectedCrypto(crypto.code)}
                className={`p-6 rounded-xl border-2 transition ${
                  selectedCrypto === crypto.code
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="text-4xl mb-2">{crypto.icon}</div>
                <div className="font-semibold text-gray-900">{crypto.name}</div>
                <div className="text-sm text-gray-600">{crypto.code}</div>
              </button>
            ))}
          </div>

          <button
            onClick={handleCreateOrders}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-4 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Lock className="w-5 h-5" />
            <span>{isProcessing ? 'Processing...' : 'Continue to Payment'}</span>
          </button>

          <div className="mt-6 text-center text-sm text-gray-500">
            🔒 Secure • Anonymous • Encrypted
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
