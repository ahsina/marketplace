import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse, PaginatedResponse } from '@/types'
import { withCsrf } from '@/lib/with-csrf'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '12')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')

    const skip = (page - 1) * pageSize

    const where: any = {
      isActive: true,
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: {
          [sortBy]: order,
        },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    let productsWithRatings = products.map((product) => {
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
          : 0

      return {
        ...product,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
        reviews: undefined,
      }
    })

    // Filter by minimum rating if specified
    if (minRating) {
      const minRatingValue = parseFloat(minRating)
      productsWithRatings = productsWithRatings.filter(
        (p) => p.averageRating >= minRatingValue
      )
    }

    // Special sorting for popularity (downloads) and rating
    if (sortBy === 'downloads') {
      productsWithRatings.sort((a, b) =>
        order === 'desc'
          ? b.downloadCount - a.downloadCount
          : a.downloadCount - b.downloadCount
      )
    } else if (sortBy === 'rating') {
      productsWithRatings.sort((a, b) =>
        order === 'desc'
          ? b.averageRating - a.averageRating
          : a.averageRating - b.averageRating
      )
    }

    const response: PaginatedResponse<typeof productsWithRatings[0]> = {
      items: productsWithRatings,
      total: productsWithRatings.length,
      page,
      pageSize,
      totalPages: Math.ceil(productsWithRatings.length / pageSize),
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createProductHandler(request: NextRequest) {
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
      title,
      description,
      shortDescription,
      price,
      discountPrice,
      categoryId,
      fileUrl,
      fileName,
      fileSize,
      thumbnailUrl,
      demoUrl,
      tags,
      currentVersion,
      downloadLimit,
      requiresLicense,
      drmEnabled,
    } = body

    if (!title || !description || !price || !categoryId || !fileUrl || !fileName || !fileSize) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        shortDescription,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        categoryId,
        fileUrl,
        fileName,
        fileSize: parseInt(fileSize),
        thumbnailUrl,
        demoUrl,
        tags: tags ? JSON.stringify(tags) : null,
        currentVersion: currentVersion || '1.0.0',
        downloadLimit: downloadLimit ? parseInt(downloadLimit) : null,
        requiresLicense: requiresLicense || false,
        drmEnabled: drmEnabled || false,
        sellerId: user.userId,
      },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: product,
        message: 'Product created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export POST with CSRF protection
export const POST = withCsrf(createProductHandler)
