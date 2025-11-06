import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

// Bulk operations on products
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
    const { action, productIds } = body

    if (!action || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Action and productIds array are required' },
        { status: 400 }
      )
    }

    // Verify all products belong to the seller
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        sellerId: user.userId,
      },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'One or more products not found or do not belong to you' },
        { status: 403 }
      )
    }

    let result
    let message = ''

    switch (action) {
      case 'activate':
        result = await prisma.product.updateMany({
          where: {
            id: { in: productIds },
            sellerId: user.userId,
          },
          data: {
            isActive: true,
          },
        })
        message = `${result.count} product(s) activated`
        break

      case 'deactivate':
        result = await prisma.product.updateMany({
          where: {
            id: { in: productIds },
            sellerId: user.userId,
          },
          data: {
            isActive: false,
          },
        })
        message = `${result.count} product(s) deactivated`
        break

      case 'feature':
        result = await prisma.product.updateMany({
          where: {
            id: { in: productIds },
            sellerId: user.userId,
          },
          data: {
            isFeatured: true,
          },
        })
        message = `${result.count} product(s) featured`
        break

      case 'unfeature':
        result = await prisma.product.updateMany({
          where: {
            id: { in: productIds },
            sellerId: user.userId,
          },
          data: {
            isFeatured: false,
          },
        })
        message = `${result.count} product(s) unfeatured`
        break

      case 'delete':
        result = await prisma.product.deleteMany({
          where: {
            id: { in: productIds },
            sellerId: user.userId,
          },
        })
        message = `${result.count} product(s) deleted`
        break

      case 'updatePrice':
        const { priceChange, changeType } = body

        if (!priceChange || !changeType) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'priceChange and changeType are required for price update' },
            { status: 400 }
          )
        }

        // Get current products to calculate new prices
        const currentProducts = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            sellerId: user.userId,
          },
          select: {
            id: true,
            price: true,
          },
        })

        // Update each product individually with calculated price
        const updates = await Promise.all(
          currentProducts.map(async (product) => {
            let newPrice = product.price

            if (changeType === 'increase') {
              newPrice = product.price + parseFloat(priceChange)
            } else if (changeType === 'decrease') {
              newPrice = Math.max(0, product.price - parseFloat(priceChange))
            } else if (changeType === 'percentage_increase') {
              newPrice = product.price * (1 + parseFloat(priceChange) / 100)
            } else if (changeType === 'percentage_decrease') {
              newPrice = product.price * (1 - parseFloat(priceChange) / 100)
            }

            return prisma.product.update({
              where: { id: product.id },
              data: { price: newPrice },
            })
          })
        )

        message = `${updates.length} product price(s) updated`
        break

      default:
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
