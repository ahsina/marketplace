import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Update a coupon
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: couponId } = await params
    const body = await request.json()

    // Check if coupon exists and belongs to seller
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    })

    if (!coupon) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    if (coupon.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update coupon
    const updatedCoupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        usageLimit: body.usageLimit !== undefined ? parseInt(body.usageLimit) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        minPurchase: body.minPurchase !== undefined ? parseFloat(body.minPurchase) : undefined,
        maxDiscount: body.maxDiscount !== undefined ? parseFloat(body.maxDiscount) : undefined,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedCoupon,
        message: 'Coupon updated successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update coupon error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: couponId } = await params

    // Check if coupon exists and belongs to seller
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    })

    if (!coupon) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    if (coupon.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete coupon
    await prisma.coupon.delete({
      where: { id: couponId },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Coupon deleted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete coupon error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
