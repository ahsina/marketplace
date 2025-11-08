import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { withCsrf } from '@/lib/with-csrf'
import { z } from 'zod'
import { validate } from '@/lib/validate'
import { ApiResponse } from '@/types'

const wishlistSchema = z.object({
  productId: z.string().cuid('Invalid product ID format'),
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional()
})

/**
 * GET /api/social/wishlist - Get user's wishlist
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

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' }
    })

    // Get product details
    const productIds = wishlistItems.map(w => w.productId)
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

    const wishlistWithProducts = wishlistItems.map(item => ({
      ...item,
      product: products.find(p => p.id === item.productId)
    }))

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          wishlist: wishlistWithProducts,
          count: wishlistItems.length
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get wishlist error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/wishlist - Add product to wishlist
 */
async function addToWishlistHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [data, validationError] = await validate(request, wishlistSchema)
    if (validationError) return validationError

    const { productId, notes } = data

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

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: user.userId,
          productId
        }
      }
    })

    if (existing) {
      // Update notes if provided
      if (notes !== undefined) {
        const updated = await prisma.wishlist.update({
          where: { id: existing.id },
          data: { notes }
        })

        return NextResponse.json<ApiResponse>(
          {
            success: true,
            data: updated,
            message: 'Wishlist item updated'
          },
          { status: 200 }
        )
      }

      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product is already in your wishlist' },
        { status: 400 }
      )
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: user.userId,
        productId,
        notes
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: wishlistItem,
        message: `Added ${product.title} to your wishlist`
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add to wishlist error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/social/wishlist - Remove product from wishlist
 */
async function removeFromWishlistHandler(request: NextRequest) {
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

    // Delete from wishlist
    const result = await prisma.wishlist.deleteMany({
      where: {
        userId: user.userId,
        productId
      }
    })

    if (result.count === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product is not in your wishlist' },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Removed from wishlist'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Remove from wishlist error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(addToWishlistHandler)
export const DELETE = withCsrf(removeFromWishlistHandler)
