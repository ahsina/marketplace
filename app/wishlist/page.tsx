'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useWishlistStore } from '@/store/useWishlistStore'
import { useCartStore } from '@/store/useCartStore'
import toast from 'react-hot-toast'
import { formatPrice } from '@/utils/helpers'

export default function WishlistPage() {
  const router = useRouter()
  const { items, removeFromWishlist, clearWishlist } = useWishlistStore()
  const { addToCart } = useCartStore()

  const handleAddToCart = (product: any) => {
    addToCart(product)
    toast.success('Added to cart!')
  }

  const handleRemove = (productId: string) => {
    removeFromWishlist(productId)
    toast.success('Removed from wishlist')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Heart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Your wishlist is empty
            </h1>
            <p className="text-gray-600 mb-8">
              Save products you love for later
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Wishlist</h1>
            <p className="text-gray-600">{items.length} saved items</p>
          </div>
          <button
            onClick={() => {
              clearWishlist()
              toast.success('Wishlist cleared')
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition group relative"
            >
              {/* Remove Button */}
              <button
                onClick={() => handleRemove(product.id)}
                className="absolute top-2 right-2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <Link href={`/products/${product.id}`}>
                <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-t-lg overflow-hidden">
                  {product.thumbnailUrl ? (
                    <img
                      src={product.thumbnailUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-6xl">📦</div>
                    </div>
                  )}
                  {product.discountPrice && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                      {Math.round(
                        ((product.price - product.discountPrice) / product.price) * 100
                      )}
                      % OFF
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/products/${product.id}`}>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-purple-600 transition">
                    {product.title}
                  </h3>
                </Link>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    {product.discountPrice ? (
                      <>
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(product.discountPrice)}
                        </span>
                        <span className="text-sm text-gray-400 line-through ml-2">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to buy?</h2>
          <p className="text-purple-100 mb-6">
            Add your favorite items to cart and checkout with crypto
          </p>
          <button
            onClick={() => {
              items.forEach(product => addToCart(product as any))
              toast.success('All items added to cart!')
              router.push('/cart')
            }}
            className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-flex items-center space-x-2"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Add All to Cart</span>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}
