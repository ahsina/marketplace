import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: categories,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, description, icon } = body

    if (!name || !slug) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        icon,
      },
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
