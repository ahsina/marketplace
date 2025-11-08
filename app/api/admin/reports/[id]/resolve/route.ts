import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { withCsrf } from '@/lib/with-csrf'
import { z } from 'zod'
import { validate } from '@/lib/validate'

const resolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  resolution: z.string().min(5, 'Resolution notes must be at least 5 characters').max(1000, 'Resolution notes must not exceed 1000 characters')
})

/**
 * POST /api/admin/reports/[id]/resolve - Resolve a content report
 */
async function resolveReportHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getUserFromRequest(request)

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { id: reportId } = await params

    // Validate request body
    const [data, validationError] = await validate(request, resolveReportSchema)
    if (validationError) return validationError

    const { status, resolution } = data

    // Check if report exists
    const report = await prisma.contentReport.findUnique({
      where: { id: reportId }
    })

    if (!report) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Report not found' },
        { status: 404 }
      )
    }

    if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Report has already been resolved' },
        { status: 400 }
      )
    }

    // Update report status
    const updatedReport = await prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status,
        resolution,
        resolvedAt: new Date(),
        assignedTo: admin.userId
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedReport,
        message: `Report ${status === 'RESOLVED' ? 'resolved' : 'dismissed'} successfully`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resolve report error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(resolveReportHandler)
