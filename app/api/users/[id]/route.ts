import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        username: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        productsAsSellerV2: {
          where: { isActive: true },
          include: {
            category: true,
            reviews: {
              select: {
                rating: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        ordersAsSeller: {
          where: { status: 'COMPLETED' },
        },
      },
    })

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate seller stats
    const totalSales = user.ordersAsSeller.length
    const totalProducts = user.productsAsSellerV2.length
    const totalRevenue = user.ordersAsSeller.reduce(
      (sum, order) => sum + order.sellerAmount,
      0
    )

    // Calculate average rating
    const allReviews = user.productsAsSellerV2.flatMap((p) => p.reviews)
    const averageRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0

    const productsWithRatings = user.productsAsSellerV2.map((product) => {
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
            product.reviews.length
          : 0

      return {
        ...product,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
        reviews: undefined,
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            createdAt: user.createdAt,
          },
          stats: {
            totalSales,
            totalProducts,
            totalRevenue,
            averageRating: Math.round(averageRating * 10) / 10,
          },
          products: productsWithRatings,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
