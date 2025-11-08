import { prisma } from './prisma'

/**
 * Enhanced Search Service
 *
 * Provides advanced search functionality with Elasticsearch fallback
 * Falls back to database search if Elasticsearch is unavailable
 */

export interface SearchOptions {
  query: string
  filters?: {
    categoryId?: string
    minPrice?: number
    maxPrice?: number
    sellerId?: string
    isActive?: boolean
    tags?: string[]
  }
  sort?: {
    field: 'relevance' | 'price' | 'createdAt' | 'popularity' | 'rating'
    order: 'asc' | 'desc'
  }
  page?: number
  pageSize?: number
}

export interface SearchResult {
  id: string
  title: string
  description: string
  price: number
  thumbnailUrl?: string
  sellerId: string
  sellerUsername: string
  categoryName: string
  averageRating: number
  reviewCount: number
  relevanceScore: number
}

/**
 * Elasticsearch client (optional)
 */
let elasticsearchClient: any = null

try {
  // In production, initialize Elasticsearch client
  // const { Client } = require('@elastic/elasticsearch')
  // elasticsearchClient = new Client({
  //   node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  //   auth: {
  //     apiKey: process.env.ELASTICSEARCH_API_KEY
  //   }
  // })
} catch (error) {
  console.log('Elasticsearch not available, using database search fallback')
}

/**
 * Search using Elasticsearch
 */
async function searchWithElasticsearch(options: SearchOptions): Promise<{
  results: SearchResult[]
  total: number
}> {
  // In production, query Elasticsearch
  // const response = await elasticsearchClient.search({
  //   index: 'products',
  //   body: {
  //     query: {
  //       multi_match: {
  //         query: options.query,
  //         fields: ['title^3', 'description', 'tags^2']
  //       }
  //     },
  //     filter: buildFilters(options.filters)
  //   }
  // })

  return { results: [], total: 0 }
}

/**
 * Search using database (fallback)
 */
async function searchWithDatabase(options: SearchOptions): Promise<{
  results: SearchResult[]
  total: number
}> {
  const { query, filters, sort, page = 1, pageSize = 20 } = options

  // Build where clause
  const where: any = {}

  // Full-text search on title and description
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { description: { contains: query } },
      { tags: { contains: query } }
    ]
  }

  // Apply filters
  if (filters) {
    if (filters.categoryId) {
      where.categoryId = filters.categoryId
    }
    if (filters.sellerId) {
      where.sellerId = filters.sellerId
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {}
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice
      }
    }
  }

  // Build order by
  let orderBy: any = {}
  if (sort) {
    switch (sort.field) {
      case 'price':
        orderBy = { price: sort.order }
        break
      case 'createdAt':
        orderBy = { createdAt: sort.order }
        break
      case 'popularity':
        orderBy = { downloadCount: sort.order }
        break
      default:
        orderBy = { viewCount: 'desc' } // Default to popularity
    }
  } else {
    orderBy = { viewCount: 'desc' }
  }

  // Execute query
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            username: true
          }
        },
        category: {
          select: {
            name: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.product.count({ where })
  ])

  // Format results
  const results: SearchResult[] = products.map(product => {
    const ratings = product.reviews.map(r => r.rating)
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0

    // Calculate relevance score (simple implementation)
    let relevanceScore = 0
    if (query) {
      const lowerQuery = query.toLowerCase()
      const lowerTitle = product.title.toLowerCase()
      const lowerDesc = product.description.toLowerCase()

      if (lowerTitle.includes(lowerQuery)) relevanceScore += 10
      if (lowerDesc.includes(lowerQuery)) relevanceScore += 5
      if (lowerTitle.startsWith(lowerQuery)) relevanceScore += 5
    }
    relevanceScore += product.viewCount * 0.01 + product.downloadCount * 0.1

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      thumbnailUrl: product.thumbnailUrl || undefined,
      sellerId: product.sellerId,
      sellerUsername: product.seller.username,
      categoryName: product.category.name,
      averageRating,
      reviewCount: product.reviews.length,
      relevanceScore
    }
  })

  // Sort by relevance if no sort specified
  if (!sort || sort.field === 'relevance') {
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  return { results, total }
}

/**
 * Main search function with automatic fallback
 */
export async function search(options: SearchOptions): Promise<{
  results: SearchResult[]
  total: number
  source: 'elasticsearch' | 'database'
}> {
  try {
    if (elasticsearchClient) {
      const result = await searchWithElasticsearch(options)
      return { ...result, source: 'elasticsearch' }
    }
  } catch (error) {
    console.error('Elasticsearch search failed, falling back to database:', error)
  }

  // Fallback to database search
  const result = await searchWithDatabase(options)
  return { ...result, source: 'database' }
}

/**
 * Auto-complete / search suggestions
 */
export async function getSuggestions(query: string, limit: number = 5): Promise<string[]> {
  if (!query || query.length < 2) {
    return []
  }

  // Get most popular products matching query
  const products = await prisma.product.findMany({
    where: {
      title: {
        contains: query
      },
      isActive: true
    },
    select: {
      title: true
    },
    orderBy: {
      viewCount: 'desc'
    },
    take: limit
  })

  return products.map(p => p.title)
}

/**
 * Index product in Elasticsearch (if available)
 */
export async function indexProduct(productId: string): Promise<void> {
  if (!elasticsearchClient) return

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: { select: { username: true } },
        category: { select: { name: true } },
        reviews: { select: { rating: true } }
      }
    })

    if (!product) return

    // Index in Elasticsearch
    // await elasticsearchClient.index({
    //   index: 'products',
    //   id: productId,
    //   document: {
    //     title: product.title,
    //     description: product.description,
    //     price: product.price,
    //     sellerId: product.sellerId,
    //     sellerUsername: product.seller.username,
    //     categoryId: product.categoryId,
    //     categoryName: product.category.name,
    //     tags: product.tags,
    //     isActive: product.isActive,
    //     createdAt: product.createdAt,
    //     viewCount: product.viewCount,
    //     downloadCount: product.downloadCount
    //   }
    // })
  } catch (error) {
    console.error('Index product error:', error)
  }
}

/**
 * Remove product from Elasticsearch index
 */
export async function removeProductFromIndex(productId: string): Promise<void> {
  if (!elasticsearchClient) return

  try {
    // await elasticsearchClient.delete({
    //   index: 'products',
    //   id: productId
    // })
  } catch (error) {
    console.error('Remove product from index error:', error)
  }
}
