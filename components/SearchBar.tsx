'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/utils/helpers'

interface SearchSuggestion {
  products: Array<{
    id: string
    title: string
    price: number
    thumbnailUrl?: string
    category: string
    type: 'product'
  }>
  categories: Array<{
    id: string
    name: string
    slug: string
    type: 'category'
  }>
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions(null)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        if (data.success) {
          setSuggestions(data.data)
          setIsOpen(true)
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(() => {
      fetchSuggestions()
    }, 300)

    return () => clearTimeout(debounce)
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(query)}`)
      setIsOpen(false)
      setQuery('')
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions(null)
    setIsOpen(false)
  }

  const hasSuggestions =
    suggestions && (suggestions.products.length > 0 || suggestions.categories.length > 0)

  return (
    <div ref={searchRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search products, categories..."
          className="w-full pl-12 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && hasSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
          {/* Products */}
          {suggestions.products.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Products
              </div>
              {suggestions.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  onClick={() => {
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.thumbnailUrl ? (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-2xl">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-600">
                      {product.title}
                    </div>
                    <div className="text-xs text-gray-500">{product.category}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatPrice(product.price)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Categories */}
          {suggestions.categories.length > 0 && (
            <div className="p-2 border-t border-gray-200">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Categories
              </div>
              {suggestions.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  onClick={() => {
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition group"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📁</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                      {category.name}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* View All Results */}
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={handleSearch}
              className="w-full text-center py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View all results for "{query}"
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isOpen && isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-3">Searching...</p>
        </div>
      )}

      {/* No Results */}
      {isOpen && !isLoading && query.length >= 2 && !hasSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 p-8 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No results found for "{query}"</p>
        </div>
      )}
    </div>
  )
}
