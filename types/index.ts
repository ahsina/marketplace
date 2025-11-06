export interface User {
  id: string
  email: string
  username: string
  role: 'BUYER' | 'SELLER' | 'ADMIN'
  subscriptionTier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  subscriptionExpiry?: Date
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  title: string
  description: string
  shortDescription?: string
  price: number
  discountPrice?: number
  fileUrl: string
  fileName: string
  fileSize: number
  thumbnailUrl?: string
  demoUrl?: string
  tags: string[]
  isActive: boolean
  downloadCount: number
  viewCount: number
  sellerId: string
  categoryId: string
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderNumber: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  totalAmount: number
  platformFee: number
  sellerAmount: number
  buyerId: string
  sellerId: string
  productId: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface Transaction {
  id: string
  amount: number
  currency: string
  cryptoCurrency: string
  cryptoAmount: number
  walletAddress: string
  transactionHash?: string
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  paymentGateway: string
  gatewayResponse?: string
  userId: string
  orderId: string
  createdAt: Date
  updatedAt: Date
  confirmedAt?: Date
}

export interface Review {
  id: string
  rating: number
  comment?: string
  isVerified: boolean
  userId: string
  productId: string
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
