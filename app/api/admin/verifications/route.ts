import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/admin/verifications - Get all pending verifications (admin only)
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const verifications = await prisma.sellerVerification.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: verifications
    })
  } catch (error) {
    console.error('Get verifications error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get verifications' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/verifications/[id] - Approve/reject verification
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { verificationId, status, rejectionReason } = await request.json()

    if (!verificationId || !status) {
      return NextResponse.json(
        { success: false, error: 'Verification ID and status are required' },
        { status: 400 }
      )
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const verification = await prisma.sellerVerification.update({
      where: { id: verificationId },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        reviewedBy: user.userId,
        reviewedAt: new Date()
      }
    })

    // Update user's verified seller status
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: verification.userId },
        data: { isVerifiedSeller: true }
      })
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: verification.userId,
        type: 'SYSTEM',
        title: status === 'APPROVED' ? 'Verification Approved!' : 'Verification Rejected',
        message: status === 'APPROVED'
          ? 'Congratulations! Your seller verification has been approved.'
          : `Your verification was rejected: ${rejectionReason}`,
        link: '/dashboard'
      }
    })

    return NextResponse.json({
      success: true,
      data: verification,
      message: `Verification ${status.toLowerCase()} successfully`
    })
  } catch (error) {
    console.error('Update verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update verification' },
      { status: 500 }
    )
  }
}
