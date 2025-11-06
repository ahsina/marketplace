import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: [],
        },
        { status: 200 }
      )
    }

    // Search in products and categories
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          title: true,
          price: true,
          thumbnailUrl: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        take: 5,
        orderBy: {
          downloadCount: 'desc',
        },
      }),
      prisma.category.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: 3,
      }),
    ])

    const suggestions = {
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        thumbnailUrl: p.thumbnailUrl,
        category: p.category.name,
        type: 'product',
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        type: 'category',
      })),
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: suggestions,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
