import Link from 'next/link'
import { ArrowRight, Shield, Zap, Lock, TrendingUp, Globe, Star } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-white py-20 sm:py-32">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              <span>The Future of Anonymous Commerce</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Buy & Sell Digital Products{' '}
              <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Anonymously
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              The world's first completely privacy-focused marketplace. Pay with crypto,
              maintain anonymity, and access thousands of digital products instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/marketplace"
                className="group bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition flex items-center space-x-2"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                href="/sellers"
                className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold border-2 border-gray-200 hover:border-purple-600 transition"
              >
                Start Selling
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-gray-900">10K+</div>
                <div className="text-sm text-gray-600">Digital Products</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">5K+</div>
                <div className="text-sm text-gray-600">Active Sellers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">50K+</div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose CryptoMarket?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for privacy, security, and seamless digital commerce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">100% Anonymous</h3>
              <p className="text-gray-600">
                No personal information required. Only email and username needed to get started.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Crypto Payments</h3>
              <p className="text-gray-600">
                Accept Bitcoin, Ethereum, and other cryptocurrencies with instant settlement.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Delivery</h3>
              <p className="text-gray-600">
                Digital products delivered immediately after payment confirmation.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-white p-8 rounded-2xl border border-yellow-100">
              <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Low Fees</h3>
              <p className="text-gray-600">
                Only 5% platform fee. Keep more of what you earn with competitive pricing.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-2xl border border-red-100">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Global Reach</h3>
              <p className="text-gray-600">
                Sell to customers worldwide. No geographical restrictions or limitations.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Support</h3>
              <p className="text-gray-600">
                24/7 customer support for all users. Premium tiers get priority assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-purple-600 to-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of sellers and buyers in the most secure anonymous marketplace
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition"
            >
              Create Free Account
            </Link>
            <Link
              href="/marketplace"
              className="bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-purple-800 transition border-2 border-white/20"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
