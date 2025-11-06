import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/types'

interface CartItem extends Product {
  quantity: number
}

interface CartState {
  items: CartItem[]
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (product) => {
        const items = get().items
        const existingItem = items.find((item) => item.id === product.id)

        if (existingItem) {
          // Digital products typically have quantity 1
          return
        }

        set({ items: [...items, { ...product, quantity: 1 }] })
      },

      removeFromCart: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) })
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const price = item.discountPrice || item.price
          return total + price * item.quantity
        }, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
