import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getActivePromotions, validatePromotion } from '@/lib/marketing'
import { ApiResponse } from '@/types'

/**
 * GET /api/marketing/promotions - Get active promotions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const sellerId = searchParams.get('sellerId') || undefined

    const promotions = await getActivePromotions({ productId, categoryId, sellerId })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          promotions,
          count: promotions.length
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get promotions error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/marketing/promotions/validate - Validate a promotion code
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { promotionId, productIds, totalAmount } = body

    const result = await validatePromotion(promotionId, user.userId, productIds, totalAmount)

    return NextResponse.json<ApiResponse>(
      {
        success: result.valid,
        data: result.valid
          ? { discount: result.discount }
          : undefined,
        error: result.error
      },
      { status: result.valid ? 200 : 400 }
    )
  } catch (error) {
    console.error('Validate promotion error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
