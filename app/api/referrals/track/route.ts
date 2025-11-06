import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/referrals/track - Track referral click (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ success: false, error: 'Referral code required' }, { status: 400 })
    }

    const referral = await prisma.referral.findUnique({
      where: { code }
    })

    if (!referral) {
      return NextResponse.json({ success: false, error: 'Invalid referral code' }, { status: 404 })
    }

    if (!referral.isActive) {
      return NextResponse.json({ success: false, error: 'Referral code is inactive' }, { status: 400 })
    }

    // Increment click count
    await prisma.referral.update({
      where: { id: referral.id },
      data: { clicks: { increment: 1 } }
    })

    return NextResponse.json({
      success: true,
      message: 'Click tracked',
      referrerId: referral.referrerId
    })
  } catch (error) {
    console.error('Track referral click error:', error)
    return NextResponse.json({ success: false, error: 'Failed to track click' }, { status: 500 })
  }
}
