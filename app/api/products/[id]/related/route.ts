import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    // Get the current product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        categoryId: true,
        tags: true,
      },
    })

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Find related products from the same category
    const relatedProducts = await prisma.product.findMany({
      where: {
        AND: [
          { id: { not: productId } },
          { isActive: true },
          { categoryId: product.categoryId },
        ],
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      take: 8,
      orderBy: {
        downloadCount: 'desc',
      },
    })

    const productsWithRatings = relatedProducts.map((p) => {
      const avgRating =
        p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : 0

      return {
        ...p,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: p.reviews.length,
        reviews: undefined,
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: productsWithRatings,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get related products error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
