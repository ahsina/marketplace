import Link from 'next/link'
import { Shield, Lock, Zap, Globe, Users, TrendingUp, Award, Heart } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-500 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-5xl font-bold mb-6">About CryptoMarket</h1>
          <p className="text-2xl text-purple-100 max-w-3xl mx-auto">
            The world's first completely anonymous digital marketplace, empowering creators and buyers worldwide.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-700 mb-4">
                We believe in a world where commerce can be conducted with complete privacy and freedom.
                CryptoMarket was created to give digital creators and buyers a platform where they can
                transact without sacrificing their anonymity.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Built on blockchain technology and powered by cryptocurrency, we're revolutionizing how
                digital products are bought and sold online.
              </p>
              <Link
                href="/register"
                className="inline-block bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Join Us Today
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-purple-50 p-6 rounded-xl">
                <div className="text-4xl font-bold text-purple-600 mb-2">50K+</div>
                <div className="text-gray-700">Transactions</div>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl">
                <div className="text-4xl font-bold text-blue-600 mb-2">10K+</div>
                <div className="text-gray-700">Products</div>
              </div>
              <div className="bg-green-50 p-6 rounded-xl">
                <div className="text-4xl font-bold text-green-600 mb-2">5K+</div>
                <div className="text-gray-700">Sellers</div>
              </div>
              <div className="bg-yellow-50 p-6 rounded-xl">
                <div className="text-4xl font-bold text-yellow-600 mb-2">100%</div>
                <div className="text-gray-700">Anonymous</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600">
                Your privacy is non-negotiable. We only collect what's absolutely necessary - email and username.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Security</h3>
              <p className="text-gray-600">
                Bank-level encryption and blockchain technology ensure your transactions are completely secure.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Global Access</h3>
              <p className="text-gray-600">
                No borders, no restrictions. Buy and sell from anywhere in the world with cryptocurrency.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Creator Focus</h3>
              <p className="text-gray-600">
                Low fees and powerful tools empower creators to succeed and earn more from their work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, secure, and anonymous - just the way it should be
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div className="text-6xl font-bold text-purple-600 mb-4">1</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Sign Up</h3>
              <p className="text-gray-600">
                Create your account with just an email and username. No personal data required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div className="text-6xl font-bold text-purple-600 mb-4">2</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Browse & Buy</h3>
              <p className="text-gray-600">
                Explore thousands of digital products and purchase with cryptocurrency.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <div className="text-6xl font-bold text-purple-600 mb-4">3</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Sell & Earn</h3>
              <p className="text-gray-600">
                Upload your products and start earning. Keep more of what you make with low fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-20 bg-gradient-to-br from-purple-600 to-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Globally Registered</h2>
          <p className="text-2xl text-purple-100 mb-12 max-w-3xl mx-auto">
            Registered and operating in Luxembourg and Dubai to serve customers worldwide
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
              <Award className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Luxembourg</h3>
              <p className="text-purple-100">European Union headquarters for regulatory compliance</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
              <Award className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Dubai, UAE</h3>
              <p className="text-purple-100">Middle East & Asia operations center</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of creators and buyers in the most secure anonymous marketplace
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition"
            >
              Create Free Account
            </Link>
            <Link
              href="/marketplace"
              className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold border-2 border-gray-300 hover:border-purple-600 transition"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
