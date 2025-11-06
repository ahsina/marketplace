import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/seller/verification - Get seller verification status
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

    const verification = await prisma.sellerVerification.findUnique({
      where: { userId: user.userId }
    })

    return NextResponse.json({
      success: true,
      data: verification || { status: 'NOT_STARTED' }
    })
  } catch (error) {
    console.error('Get verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get verification status' },
      { status: 500 }
    )
  }
}

// POST /api/seller/verification - Submit verification request
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

    const { businessName, businessType, taxId, idDocumentUrl, proofOfAddress } = await request.json()

    // Check if verification already exists
    const existing = await prisma.sellerVerification.findUnique({
      where: { userId: user.userId }
    })

    if (existing && existing.status === 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Verification request already pending' },
        { status: 400 }
      )
    }

    if (existing && existing.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Already verified' },
        { status: 400 }
      )
    }

    // Create or update verification request
    const verification = await prisma.sellerVerification.upsert({
      where: { userId: user.userId },
      update: {
        businessName,
        businessType,
        taxId,
        idDocumentUrl,
        proofOfAddress,
        status: 'PENDING',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null
      },
      create: {
        userId: user.userId,
        businessName,
        businessType,
        taxId,
        idDocumentUrl,
        proofOfAddress,
        status: 'PENDING'
      }
    })

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: user.userId,
        type: 'SYSTEM',
        title: 'Verification Submitted',
        message: 'Your seller verification request has been submitted and is under review.',
        link: '/dashboard'
      }
    })

    return NextResponse.json({
      success: true,
      data: verification,
      message: 'Verification request submitted successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Submit verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit verification' },
      { status: 500 }
    )
  }
}
