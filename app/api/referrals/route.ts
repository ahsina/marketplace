import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { nanoid } from 'nanoid'

// GET /api/referrals - Get user's referral codes
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.userId },
      include: {
        referrals: {
          select: {
            id: true,
            newUserId: true,
            orderId: true,
            commission: true,
            paid: true,
            paidAt: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: referrals })
  } catch (error) {
    console.error('Get referrals error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get referrals' }, { status: 500 })
  }
}

// POST /api/referrals - Create new referral code
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { commissionRate } = await request.json()

    // Generate unique referral code
    let code: string
    let isUnique = false
    while (!isUnique) {
      code = `REF-${nanoid(8).toUpperCase()}`
      const existing = await prisma.referral.findUnique({ where: { code } })
      if (!existing) isUnique = true
    }

    const referral = await prisma.referral.create({
      data: {
        code: code!,
        referrerId: user.userId,
        commissionRate: commissionRate || 0.1 // Default 10%
      }
    })

    return NextResponse.json({
      success: true,
      data: referral,
      message: 'Referral code created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create referral error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create referral' }, { status: 500 })
  }
}

// PATCH /api/referrals - Update referral code (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    const { referralId, isActive } = await request.json()

    const referral = await prisma.referral.findUnique({
      where: { id: referralId }
    })

    if (!referral) {
      return NextResponse.json({ success: false, error: 'Referral not found' }, { status: 404 })
    }

    if (referral.referrerId !== user.userId) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const updated = await prisma.referral.update({
      where: { id: referralId },
      data: { isActive }
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Referral ${isActive ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    console.error('Update referral error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update referral' }, { status: 500 })
  }
}
