import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { withCsrf } from '@/lib/with-csrf'
import { z } from 'zod'
import { validate } from '@/lib/validate'
import { ApiResponse } from '@/types'

const likeSchema = z.object({
  productId: z.string().cuid('Invalid product ID format')
})

/**
 * GET /api/social/likes - Get user's liked products
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (productId) {
      // Check if user has liked this specific product
      const like = await prisma.productLike.findUnique({
        where: {
          userId_productId: {
            userId: user.userId,
            productId
          }
        }
      })

      // Get total likes for this product
      const totalLikes = await prisma.productLike.count({
        where: { productId }
      })

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: {
            isLiked: !!like,
            totalLikes
          }
        },
        { status: 200 }
      )
    } else {
      // Get all products liked by user
      const likes = await prisma.productLike.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' }
      })

      // Get product details
      const productIds = likes.map(l => l.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              isVerifiedSeller: true
            }
          },
          category: true
        }
      })

      const likesWithProducts = likes.map(like => ({
        ...like,
        product: products.find(p => p.id === like.productId)
      }))

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: {
            likes: likesWithProducts,
            count: likes.length
          }
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Get likes error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/likes - Like a product
 */
async function likeHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [data, validationError] = await validate(request, likeSchema)
    if (validationError) return validationError

    const { productId } = data

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, isActive: true }
    })

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if already liked
    const existing = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId: user.userId,
          productId
        }
      }
    })

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You have already liked this product' },
        { status: 400 }
      )
    }

    // Create like
    const like = await prisma.productLike.create({
      data: {
        userId: user.userId,
        productId
      }
    })

    // Get total likes
    const totalLikes = await prisma.productLike.count({
      where: { productId }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          like,
          totalLikes
        },
        message: `You liked ${product.title}`
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Like product error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/social/likes - Unlike a product
 */
async function unlikeHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'productId is required' },
        { status: 400 }
      )
    }

    // Delete like
    const result = await prisma.productLike.deleteMany({
      where: {
        userId: user.userId,
        productId
      }
    })

    if (result.count === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You have not liked this product' },
        { status: 404 }
      )
    }

    // Get total likes
    const totalLikes = await prisma.productLike.count({
      where: { productId }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { totalLikes },
        message: 'Successfully unliked product'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unlike product error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(likeHandler)
export const DELETE = withCsrf(unlikeHandler)
