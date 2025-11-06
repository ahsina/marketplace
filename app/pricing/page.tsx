'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'

const plans = [
  {
    name: 'FREE',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      'List up to 5 products',
      '5% platform fee',
      'Basic support',
      'Standard product visibility',
      'Email notifications',
    ],
    limitations: [
      'No featured listings',
      'Standard analytics',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'BASIC',
    price: 19,
    description: 'For growing sellers',
    features: [
      'List up to 25 products',
      '4% platform fee',
      'Priority support',
      'Enhanced product visibility',
      'Advanced analytics',
      'Custom seller badge',
      'Email notifications',
    ],
    cta: 'Start Basic',
    popular: false,
  },
  {
    name: 'PREMIUM',
    price: 49,
    description: 'For professional sellers',
    features: [
      'Unlimited products',
      '3% platform fee',
      'Priority support 24/7',
      'Featured product listings',
      'Advanced analytics & insights',
      'Custom seller badge',
      'Marketing tools',
      'API access',
      'Bulk upload tools',
    ],
    cta: 'Go Premium',
    popular: true,
  },
  {
    name: 'ENTERPRISE',
    price: 199,
    description: 'For large businesses',
    features: [
      'Unlimited products',
      '2% platform fee',
      'Dedicated account manager',
      'Premium featured listings',
      'White-label options',
      'Custom integrations',
      'Advanced API access',
      'Bulk operations',
      'Custom contracts',
      'Revenue sharing options',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const { isAuthenticated } = useAuthStore()

  const getPrice = (basePrice: number) => {
    if (basePrice === 0) return 0
    return billingCycle === 'yearly' ? Math.floor(basePrice * 12 * 0.8) : basePrice
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Start for free, upgrade as you grow. All plans include core marketplace features.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition relative ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="absolute -top-3 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                plan.popular ? 'ring-2 ring-purple-600 relative' : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white text-center py-2 text-sm font-semibold flex items-center justify-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>MOST POPULAR</span>
                </div>
              )}

              <div className="p-6">
                {/* Plan Name & Price */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">
                      ${getPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 ml-2">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>

                  {billingCycle === 'yearly' && plan.price > 0 && (
                    <div className="text-sm text-green-600 mt-1">
                      Save ${plan.price * 12 * 0.2}/year
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="mb-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <Link
                  href={isAuthenticated ? '/dashboard' : '/register'}
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:opacity-90'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-medium text-gray-700">Feature</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">FREE</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">BASIC</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700 bg-purple-50">PREMIUM</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">ENTERPRISE</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Product Listings', free: '5', basic: '25', premium: 'Unlimited', enterprise: 'Unlimited' },
                  { name: 'Platform Fee', free: '5%', basic: '4%', premium: '3%', enterprise: '2%' },
                  { name: 'Support', free: 'Basic', basic: 'Priority', premium: '24/7 Priority', enterprise: 'Dedicated Manager' },
                  { name: 'Analytics', free: 'Basic', basic: 'Advanced', premium: 'Advanced', enterprise: 'Custom' },
                  { name: 'API Access', free: '✗', basic: '✗', premium: '✓', enterprise: '✓' },
                  { name: 'Featured Listings', free: '✗', basic: '✗', premium: '✓', enterprise: '✓' },
                  { name: 'Custom Badge', free: '✗', basic: '✓', premium: '✓', enterprise: '✓' },
                  { name: 'Marketing Tools', free: '✗', basic: '✗', premium: '✓', enterprise: '✓' },
                ].map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700">{row.name}</td>
                    <td className="py-4 px-4 text-center text-gray-600">{row.free}</td>
                    <td className="py-4 px-4 text-center text-gray-600">{row.basic}</td>
                    <td className="py-4 px-4 text-center text-gray-900 bg-purple-50 font-medium">{row.premium}</td>
                    <td className="py-4 px-4 text-center text-gray-600">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Have Questions?</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Our team is here to help you choose the perfect plan for your business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Contact Sales
            </Link>
            <Link
              href="/help"
              className="bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-800 transition border-2 border-white/20"
            >
              View FAQ
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
