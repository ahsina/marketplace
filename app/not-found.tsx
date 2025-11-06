import Link from 'next/link'
import { Home, Search, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-9xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              404
            </div>
          </div>

          {/* Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition"
            >
              <Home className="w-5 h-5" />
              <span>Go Home</span>
            </Link>

            <Link
              href="/marketplace"
              className="inline-flex items-center space-x-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold border-2 border-gray-300 hover:border-purple-600 transition"
            >
              <Search className="w-5 h-5" />
              <span>Browse Products</span>
            </Link>
          </div>

          {/* Suggestions */}
          <div className="mt-12 p-6 bg-white rounded-xl shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-4">
              You might be interested in:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/marketplace"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                → Marketplace
              </Link>
              <Link
                href="/categories"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                → Categories
              </Link>
              <Link
                href="/pricing"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                → Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
