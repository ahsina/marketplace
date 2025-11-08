import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { withCsrf } from '@/lib/with-csrf'
import { z } from 'zod'
import { validate } from '@/lib/validate'
import { ApiResponse } from '@/types'

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  isPublic: z.boolean().default(false),
  productIds: z.array(z.string().cuid('Invalid product ID')).max(100, 'Maximum 100 products per collection')
})

/**
 * GET /api/social/collections - Get user's collections
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isPublic = searchParams.get('public') === 'true'

    let where: any = {}

    if (userId) {
      where.userId = userId
      // Only show public collections if viewing another user's collections
      if (userId !== user?.userId) {
        where.isPublic = true
      }
    } else if (user) {
      where.userId = user.userId
    } else if (isPublic) {
      where.isPublic = true
    } else {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const collections = await prisma.collection.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Get product details for each collection
    const collectionsWithProducts = await Promise.all(
      collections.map(async (collection) => {
        const productIds = JSON.parse(collection.productIds) as string[]

        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            title: true,
            price: true,
            thumbnailUrl: true,
            seller: {
              select: {
                id: true,
                username: true
              }
            }
          }
        })

        return {
          ...collection,
          productIds,
          products,
          productCount: products.length
        }
      })
    )

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          collections: collectionsWithProducts,
          count: collections.length
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get collections error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/collections - Create a new collection
 */
async function createCollectionHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [data, validationError] = await validate(request, collectionSchema)
    if (validationError) return validationError

    const { name, description, isPublic, productIds } = data

    // Verify all products exist
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'One or more products not found' },
        { status: 404 }
      )
    }

    // Create collection
    const collection = await prisma.collection.create({
      data: {
        userId: user.userId,
        name,
        description,
        isPublic,
        productIds: JSON.stringify(productIds)
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          ...collection,
          productIds
        },
        message: 'Collection created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create collection error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(createCollectionHandler)
