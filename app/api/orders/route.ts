import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { generateOrderNumber, calculatePlatformFee, calculateSellerAmount } from '@/utils/helpers'

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No products specified' },
        { status: 400 }
      )
    }

    // Fetch products
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    })

    if (products.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No valid products found' },
        { status: 400 }
      )
    }

    // Create orders for each product
    const orders = await Promise.all(
      products.map(async (product) => {
        const totalAmount = product.discountPrice || product.price
        const platformFee = calculatePlatformFee(totalAmount)
        const sellerAmount = calculateSellerAmount(totalAmount)

        return prisma.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            totalAmount,
            platformFee,
            sellerAmount,
            buyerId: user.userId,
            sellerId: product.sellerId,
            productId: product.id,
          },
          include: {
            product: {
              select: {
                title: true,
                thumbnailUrl: true,
              },
            },
          },
        })
      })
    )

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          orders,
          totalAmount,
        },
        message: 'Orders created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'buyer' // buyer or seller

    const where: any = {}

    if (type === 'buyer') {
      where.buyerId = user.userId
    } else if (type === 'seller') {
      where.sellerId = user.userId
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        product: {
          select: {
            title: true,
            thumbnailUrl: true,
            fileUrl: true,
            fileName: true,
          },
        },
        buyer: {
          select: {
            username: true,
          },
        },
        seller: {
          select: {
            username: true,
          },
        },
        transactions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: orders,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
