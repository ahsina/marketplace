import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'
import { validate } from '@/lib/validate'
import { ApiResponse } from '@/types'

const shareSchema = z.object({
  productId: z.string().cuid('Invalid product ID format'),
  platform: z.enum(['twitter', 'facebook', 'linkedin', 'email', 'copy'], {
    message: 'Invalid platform'
  })
})

/**
 * POST /api/social/shares - Record a product share
 */
export async function POST(request: NextRequest) {
  try {
    // Shares can be tracked anonymously, but we'll associate with user if logged in
    const user = getUserFromRequest(request)

    const [data, validationError] = await validate(request, shareSchema)
    if (validationError) return validationError

    const { productId, platform } = data

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true }
    })

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Record share
    const share = await prisma.productShare.create({
      data: {
        userId: user?.userId || 'anonymous',
        productId,
        platform
      }
    })

    // Get total shares for this product
    const totalShares = await prisma.productShare.count({
      where: { productId }
    })

    const sharesByPlatform = await prisma.productShare.groupBy({
      by: ['platform'],
      where: { productId },
      _count: { id: true }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          share,
          totalShares,
          sharesByPlatform: sharesByPlatform.map(s => ({
            platform: s.platform,
            count: s._count.id
          }))
        },
        message: 'Share recorded successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Record share error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/social/shares - Get share statistics for a product
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'productId is required' },
        { status: 400 }
      )
    }

    const [totalShares, sharesByPlatform, recentShares] = await Promise.all([
      prisma.productShare.count({ where: { productId } }),
      prisma.productShare.groupBy({
        by: ['platform'],
        where: { productId },
        _count: { id: true }
      }),
      prisma.productShare.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          platform: true,
          createdAt: true
        }
      })
    ])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          totalShares,
          sharesByPlatform: sharesByPlatform.map(s => ({
            platform: s.platform,
            count: s._count.id
          })),
          recentShares
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get shares error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
