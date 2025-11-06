import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/products/[id]/versions/[versionId] - Get specific version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { versionId } = await params

    const version = await prisma.productVersion.findUnique({
      where: { id: versionId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sellerId: true
          }
        }
      }
    })

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: version, message: 'Version retrieved successfully' }
    )
  } catch (error) {
    console.error('Error fetching version:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch version' },
      { status: 500 }
    )
  }
}

// PATCH /api/products/[id]/versions/[versionId] - Update version (seller only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { versionId } = await params
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

    const version = await prisma.productVersion.findUnique({
      where: { id: versionId },
      include: { product: true }
    })

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    if (version.product.sellerId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this version' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { changelog, isActive } = body

    const updatedVersion = await prisma.productVersion.update({
      where: { id: versionId },
      data: {
        ...(changelog !== undefined && { changelog }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(
      { success: true, data: updatedVersion, message: 'Version updated successfully' }
    )
  } catch (error) {
    console.error('Error updating version:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update version' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/versions/[versionId] - Delete version (seller only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { versionId } = await params
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

    const version = await prisma.productVersion.findUnique({
      where: { id: versionId },
      include: { product: true }
    })

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    if (version.product.sellerId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this version' },
        { status: 403 }
      )
    }

    await prisma.productVersion.delete({
      where: { id: versionId }
    })

    return NextResponse.json(
      { success: true, data: null, message: 'Version deleted successfully' }
    )
  } catch (error) {
    console.error('Error deleting version:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete version' },
      { status: 500 }
    )
  }
}
