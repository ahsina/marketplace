import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Create a new coupon
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
    const {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      usageLimit,
      expiresAt,
      productId,
    } = body

    // Validate required fields
    if (!code || !type || !value) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Code, type, and value are required' },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (existingCoupon) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Coupon code already exists' },
        { status: 400 }
      )
    }

    // If productId is provided, verify it belongs to the seller
    if (productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          sellerId: user.userId,
        },
      })

      if (!product) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Product not found or does not belong to you' },
          { status: 404 }
        )
      }
    }

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        sellerId: user.userId,
        productId: productId || null,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: coupon,
        message: 'Coupon created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create coupon error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get seller's coupons
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        sellerId: user.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: coupons,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get coupons error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
