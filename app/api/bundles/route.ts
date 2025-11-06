import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Create a new bundle
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
    const { name, description, productIds, discountPercent } = body

    // Validate required fields
    if (!name || !description || !productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Name, description, and at least 2 products are required' },
        { status: 400 }
      )
    }

    if (!discountPercent || discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Discount percent must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Verify all products exist and belong to the seller
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        sellerId: user.userId,
        isActive: true,
      },
      select: {
        id: true,
        price: true,
        discountPrice: true,
      },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'One or more products not found or do not belong to you' },
        { status: 404 }
      )
    }

    // Calculate bundle price
    const totalPrice = products.reduce((sum, p) => sum + (p.discountPrice || p.price), 0)
    const bundlePrice = totalPrice * (1 - discountPercent / 100)

    // Create bundle
    const bundle = await prisma.bundle.create({
      data: {
        name,
        description,
        price: bundlePrice,
        discountPercent: parseFloat(discountPercent),
        sellerId: user.userId,
        productIds: JSON.stringify(productIds),
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: bundle,
        message: 'Bundle created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create bundle error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get bundles (for sellers or public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')
    const user = getUserFromRequest(request)

    let bundles

    if (sellerId) {
      // Get public bundles for a specific seller
      bundles = await prisma.bundle.findMany({
        where: {
          sellerId,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } else if (user) {
      // Get seller's own bundles (including inactive)
      bundles = await prisma.bundle.findMany({
        where: {
          sellerId: user.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } else {
      // Get all active bundles
      bundles = await prisma.bundle.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      })
    }

    // Enrich bundles with product information
    const enrichedBundles = await Promise.all(
      bundles.map(async (bundle) => {
        const productIds = JSON.parse(bundle.productIds)
        const products = await prisma.product.findMany({
          where: {
            id: { in: productIds },
          },
          select: {
            id: true,
            title: true,
            price: true,
            discountPrice: true,
            thumbnailUrl: true,
          },
        })

        const totalPrice = products.reduce((sum, p) => sum + (p.discountPrice || p.price), 0)

        return {
          ...bundle,
          products,
          totalPrice,
          savings: totalPrice - bundle.price,
        }
      })
    )

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: enrichedBundles,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get bundles error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
