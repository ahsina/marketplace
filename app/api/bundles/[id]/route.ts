import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Get a specific bundle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bundleId } = await params

    const bundle = await prisma.bundle.findUnique({
      where: { id: bundleId },
    })

    if (!bundle) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Get products in bundle
    const productIds = JSON.parse(bundle.productIds)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            isVerifiedSeller: true,
          },
        },
      },
    })

    const totalPrice = products.reduce((sum, p) => sum + (p.discountPrice || p.price), 0)

    const enrichedBundle = {
      ...bundle,
      products,
      totalPrice,
      savings: totalPrice - bundle.price,
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: enrichedBundle,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get bundle error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a bundle
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

    const { id: bundleId } = await params
    const body = await request.json()

    // Check if bundle exists and belongs to seller
    const bundle = await prisma.bundle.findUnique({
      where: { id: bundleId },
    })

    if (!bundle) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      )
    }

    if (bundle.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update bundle
    const updatedBundle = await prisma.bundle.update({
      where: { id: bundleId },
      data: {
        name: body.name || undefined,
        description: body.description || undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        discountPercent: body.discountPercent !== undefined ? parseFloat(body.discountPercent) : undefined,
      },
    })

    // Recalculate price if discount changed
    if (body.discountPercent !== undefined) {
      const productIds = JSON.parse(updatedBundle.productIds)
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          price: true,
          discountPrice: true,
        },
      })

      const totalPrice = products.reduce((sum, p) => sum + (p.discountPrice || p.price), 0)
      const newPrice = totalPrice * (1 - updatedBundle.discountPercent / 100)

      await prisma.bundle.update({
        where: { id: bundleId },
        data: { price: newPrice },
      })
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedBundle,
        message: 'Bundle updated successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update bundle error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a bundle
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

    const { id: bundleId } = await params

    // Check if bundle exists and belongs to seller
    const bundle = await prisma.bundle.findUnique({
      where: { id: bundleId },
    })

    if (!bundle) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      )
    }

    if (bundle.sellerId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete bundle
    await prisma.bundle.delete({
      where: { id: bundleId },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Bundle deleted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete bundle error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
