import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Increment view count
    await prisma.product.update({
      where: { id: id },
      data: { viewCount: { increment: 1 } },
    })

    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.sellerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        ...body,
        price: body.price ? parseFloat(body.price) : undefined,
        discountPrice: body.discountPrice ? parseFloat(body.discountPrice) : undefined,
        fileSize: body.fileSize ? parseInt(body.fileSize) : undefined,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.sellerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.product.delete({
      where: { id: id },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Product deleted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
