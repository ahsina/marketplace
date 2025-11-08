import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

/**
 * GET /api/admin/disputes - Get all disputes (admin only)
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
    const status = searchParams.get('status')
    const reason = searchParams.get('reason')
    const assignedTo = searchParams.get('assignedTo')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (reason) {
      where.reason = reason
    }

    if (assignedTo === 'me') {
      where.assignedTo = admin.userId
    } else if (assignedTo === 'unassigned') {
      where.assignedTo = null
    } else if (assignedTo) {
      where.assignedTo = assignedTo
    }

    const [disputes, total, stats] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          order: {
            include: {
              product: { select: { title: true, thumbnailUrl: true } },
              buyer: { select: { username: true, email: true } },
              seller: { select: { username: true, email: true } }
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.dispute.count({ where }),
      prisma.dispute.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ])

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          disputes: disputes.map(d => ({
            ...d,
            buyerEvidence: d.buyerEvidence ? JSON.parse(d.buyerEvidence) : null,
            sellerEvidence: d.sellerEvidence ? JSON.parse(d.sellerEvidence) : null
          })),
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          },
          stats: stats.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id
            return acc
          }, {} as Record<string, number>)
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get admin disputes error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
