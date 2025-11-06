import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { generateLicenseKey } from '@/lib/license'

// GET /api/license-keys - Get user's license keys
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('orderId')

    const where: any = { buyerId: user.userId }
    if (orderId) {
      where.orderId = orderId
    }

    const licenseKeys = await prisma.licenseKey.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            currentVersion: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(
      { success: true, data: licenseKeys, message: 'License keys retrieved successfully' }
    )
  } catch (error) {
    console.error('Error fetching license keys:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch license keys' },
      { status: 500 }
    )
  }
}

// POST /api/license-keys - Generate license key (automatic on order completion)
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { orderId, productId, maxActivations, expiresAt } = body

    if (!orderId || !productId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: orderId, productId' },
        { status: 400 }
      )
    }

    // Verify order belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.buyerId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Check if license key already exists for this order
    const existingKey = await prisma.licenseKey.findFirst({
      where: {
        orderId,
        productId
      }
    })

    if (existingKey) {
      return NextResponse.json(
        { success: false, error: 'License key already exists for this order' },
        { status: 400 }
      )
    }

    // Generate unique license key
    const key = generateLicenseKey()

    const licenseKey = await prisma.licenseKey.create({
      data: {
        key,
        orderId,
        productId,
        buyerId: order.buyerId,
        maxActivations: maxActivations || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        product: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    return NextResponse.json(
      { success: true, data: licenseKey, message: 'License key generated successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error generating license key:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate license key' },
      { status: 500 }
    )
  }
}
