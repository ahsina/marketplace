import Link from 'next/link'
import { Shield, Lock, Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">CM</span>
              </div>
              <span className="text-xl font-bold text-white">
                CryptoMarket
              </span>
            </div>
            <p className="text-sm text-gray-400">
              The world's first completely anonymous digital marketplace powered by cryptocurrency.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-white font-semibold mb-4">Marketplace</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/marketplace" className="hover:text-purple-400 transition">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-purple-400 transition">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/sellers" className="hover:text-purple-400 transition">
                  Top Sellers
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-purple-400 transition">
                  Special Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-purple-400 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-purple-400 transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-purple-400 transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-purple-400 transition">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-purple-400 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-purple-400 transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-purple-400 transition">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-800">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <div>
              <h4 className="text-white font-medium mb-1">100% Secure</h4>
              <p className="text-sm text-gray-400">End-to-end encrypted transactions</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Lock className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <div>
              <h4 className="text-white font-medium mb-1">Anonymous</h4>
              <p className="text-sm text-gray-400">Complete privacy protection</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Zap className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <div>
              <h4 className="text-white font-medium mb-1">Instant Delivery</h4>
              <p className="text-sm text-gray-400">Get your products immediately</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} CryptoMarket. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="text-sm text-gray-400">Registered in Luxembourg & Dubai</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
