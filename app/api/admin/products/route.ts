import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApprovalStatus } from '@prisma/client'

// GET /api/admin/products - Get all products with moderation status
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // PENDING, APPROVED, REJECTED
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get products based on approval status filter
    let products: any[]
    let total: number

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      // If filtering by approval status, join with ProductApproval table
      const approvals = await prisma.productApproval.findMany({
        where: { status: status as ApprovalStatus },
        select: { productId: true },
        skip: (page - 1) * limit,
        take: limit
      })

      const productIds = approvals.map(a => a.productId)

      const [prods, count] = await Promise.all([
        prisma.product.findMany({
          where: { id: { in: productIds } },
          include: {
            seller: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                orders: true,
                reviews: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.productApproval.count({ where: { status: status as ApprovalStatus } })
      ])

      products = prods
      total = count
    } else {
      // No status filter, get all products
      const [prods, count] = await Promise.all([
        prisma.product.findMany({
          include: {
            seller: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                orders: true,
                reviews: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.product.count()
      ])

      products = prods
      total = count
    }

    // Get approval status for each product
    const productsWithApproval = await Promise.all(
      products.map(async (product) => {
        const approval = await prisma.productApproval.findUnique({
          where: { productId: product.id }
        })
        return { ...product, approval }
      })
    )

    return NextResponse.json({
      success: true,
      data: productsWithApproval,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get admin products error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get products' }, { status: 500 })
  }
}
