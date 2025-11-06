import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Product {
  id: string
  title: string
  description?: string
  price: number
  discountPrice?: number
  thumbnailUrl?: string
  category: {
    id: string
    name: string
  }
  seller: {
    username: string
  }
  averageRating?: number
  reviewCount?: number
  downloadCount?: number
  fileSize?: number
}

interface ComparisonState {
  items: Product[]
  addToComparison: (product: Product) => void
  removeFromComparison: (productId: string) => void
  isInComparison: (productId: string) => boolean
  clearComparison: () => void
  getTotalItems: () => number
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      items: [],

      addToComparison: (product) => {
        const { items } = get()

        // Limit to 4 products for comparison
        if (items.length >= 4) {
          return
        }

        // Check if product already exists
        if (items.find((item) => item.id === product.id)) {
          return
        }

        set({ items: [...items, product] })
      },

      removeFromComparison: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }))
      },

      isInComparison: (productId) => {
        return get().items.some((item) => item.id === productId)
      },

      clearComparison: () => {
        set({ items: [] })
      },

      getTotalItems: () => {
        return get().items.length
      },
    }),
    {
      name: 'comparison-storage',
    }
  )
)
