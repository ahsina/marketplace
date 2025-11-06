import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/referrals/earnings - Get referral earnings summary
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
          include: {
            referral: {
              select: {
                code: true
              }
            }
          }
        }
      }
    })

    // Calculate totals
    const totalClicks = referrals.reduce((sum, r) => sum + r.clicks, 0)
    const totalConversions = referrals.reduce((sum, r) => sum + r.conversions, 0)
    const totalEarnings = referrals.reduce((sum, r) => sum + r.totalEarnings, 0)

    const conversions = referrals.flatMap(r => r.referrals)
    const paidEarnings = conversions.filter(c => c.paid).reduce((sum, c) => sum + c.commission, 0)
    const pendingEarnings = conversions.filter(c => !c.paid).reduce((sum, c) => sum + c.commission, 0)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalClicks,
          totalConversions,
          totalEarnings,
          paidEarnings,
          pendingEarnings,
          conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
        },
        referrals: referrals.map(r => ({
          id: r.id,
          code: r.code,
          clicks: r.clicks,
          conversions: r.conversions,
          totalEarnings: r.totalEarnings,
          commissionRate: r.commissionRate,
          isActive: r.isActive,
          createdAt: r.createdAt
        })),
        recentConversions: conversions.slice(0, 20).map(c => ({
          id: c.id,
          referralCode: c.referral.code,
          commission: c.commission,
          paid: c.paid,
          paidAt: c.paidAt,
          createdAt: c.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Get referral earnings error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get earnings' }, { status: 500 })
  }
}
