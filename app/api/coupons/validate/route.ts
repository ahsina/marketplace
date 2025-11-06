import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// Validate a coupon code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, productId, orderAmount } = body

    if (!code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      )
    }

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!coupon) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid coupon code' },
        { status: 404 }
      )
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'This coupon is no longer active' },
        { status: 400 }
      )
    }

    // Check if coupon has expired
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'This coupon has expired' },
        { status: 400 }
      )
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'This coupon has reached its usage limit' },
        { status: 400 }
      )
    }

    // Check if coupon is for a specific product
    if (coupon.productId && coupon.productId !== productId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'This coupon is not valid for this product' },
        { status: 400 }
      )
    }

    // Check minimum purchase requirement
    if (coupon.minPurchase && orderAmount < coupon.minPurchase) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required for this coupon`,
        },
        { status: 400 }
      )
    }

    // Calculate discount
    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = (orderAmount * coupon.value) / 100
      // Apply max discount if specified
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount
      }
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = coupon.value
      // Don't allow discount to exceed order amount
      if (discount > orderAmount) {
        discount = orderAmount
      }
    }

    const finalAmount = Math.max(0, orderAmount - discount)

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          coupon: {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
          },
          originalAmount: orderAmount,
          discount: discount,
          finalAmount: finalAmount,
        },
        message: 'Coupon applied successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Validate coupon error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
