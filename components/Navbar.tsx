'use client'

import Link from 'next/link'
import { ShoppingCart, User, Search, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useCartStore } from '@/store/useCartStore'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthStore()
  const { getTotalItems } = useCartStore()

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">CM</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              CryptoMarket
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/marketplace" className="text-gray-700 hover:text-purple-600 transition">
              Marketplace
            </Link>
            <Link href="/categories" className="text-gray-700 hover:text-purple-600 transition">
              Categories
            </Link>
            <Link href="/sellers" className="text-gray-700 hover:text-purple-600 transition">
              Become a Seller
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Search className="w-5 h-5 text-gray-600" />
            </button>

            <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-lg transition relative">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-purple-600 transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-700 hover:text-purple-600 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-purple-600 transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg hover:opacity-90 transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              href="/marketplace"
              className="block text-gray-700 hover:text-purple-600 transition"
            >
              Marketplace
            </Link>
            <Link
              href="/categories"
              className="block text-gray-700 hover:text-purple-600 transition"
            >
              Categories
            </Link>
            <Link
              href="/sellers"
              className="block text-gray-700 hover:text-purple-600 transition"
            >
              Become a Seller
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-gray-700 hover:text-purple-600 transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="block w-full text-left text-gray-700 hover:text-purple-600 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-gray-700 hover:text-purple-600 transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg text-center"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
