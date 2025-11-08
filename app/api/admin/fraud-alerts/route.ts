import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

/**
 * GET /api/admin/fraud-alerts - Get all fraud alerts (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const riskLevel = searchParams.get('riskLevel')
    const isResolved = searchParams.get('isResolved')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}

    if (riskLevel) {
      where.riskLevel = riskLevel
    }

    if (isResolved !== null) {
      where.isResolved = isResolved === 'true'
    }

    const [alerts, total] = await Promise.all([
      prisma.fraudAlert.findMany({
        where,
        orderBy: [
          { riskLevel: 'desc' }, // CRITICAL first
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.fraudAlert.count({ where })
    ])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          alerts,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get fraud alerts error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
