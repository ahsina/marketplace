import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/admin/referrals - Get all referral activity (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        include: {
          referrals: {
            select: {
              id: true,
              commission: true,
              paid: true,
              createdAt: true
            }
          }
        },
        orderBy: { totalEarnings: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.referral.count()
    ])

    return NextResponse.json({
      success: true,
      data: referrals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get admin referrals error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get referrals' }, { status: 500 })
  }
}

// PATCH /api/admin/referrals - Mark commissions as paid
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { conversionIds } = await request.json()

    if (!conversionIds || !Array.isArray(conversionIds)) {
      return NextResponse.json({ success: false, error: 'Conversion IDs array required' }, { status: 400 })
    }

    await prisma.referralConversion.updateMany({
      where: { id: { in: conversionIds } },
      data: {
        paid: true,
        paidAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: `${conversionIds.length} commissions marked as paid`
    })
  } catch (error) {
    console.error('Update referral payments error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update payments' }, { status: 500 })
  }
}
