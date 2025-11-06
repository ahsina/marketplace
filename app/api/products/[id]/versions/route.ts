import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/products/[id]/versions - Get all versions for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params

    const versions = await prisma.productVersion.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(
      { success: true, data: versions, message: 'Product versions retrieved successfully' }
    )
  } catch (error) {
    console.error('Error fetching product versions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product versions' },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/versions - Create new version (seller only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Verify product ownership
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.sellerId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to add versions to this product' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { version, fileUrl, fileName, fileSize, changelog } = body

    if (!version || !fileUrl || !fileName || !fileSize) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: version, fileUrl, fileName, fileSize' },
        { status: 400 }
      )
    }

    // Check if version already exists
    const existingVersion = await prisma.productVersion.findUnique({
      where: {
        productId_version: {
          productId,
          version
        }
      }
    })

    if (existingVersion) {
      return NextResponse.json(
        { success: false, error: 'Version already exists' },
        { status: 400 }
      )
    }

    // Create new version
    const newVersion = await prisma.productVersion.create({
      data: {
        productId,
        version,
        fileUrl,
        fileName,
        fileSize: parseInt(fileSize),
        changelog: changelog || null
      }
    })

    // Update product's current version
    await prisma.product.update({
      where: { id: productId },
      data: { currentVersion: version }
    })

    return NextResponse.json(
      { success: true, data: newVersion, message: 'Version created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating product version:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create product version' },
      { status: 500 }
    )
  }
}
