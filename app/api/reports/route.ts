import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { withCsrf } from '@/lib/with-csrf'
import { z } from 'zod'
import { validate } from '@/lib/validate'

const createReportSchema = z.object({
  type: z.enum(['USER', 'PRODUCT', 'REVIEW', 'MESSAGE']),
  reason: z.enum(['SPAM', 'INAPPROPRIATE_CONTENT', 'FRAUD', 'COPYRIGHT_VIOLATION', 'HARASSMENT', 'FAKE_PRODUCT', 'MALWARE', 'OTHER']),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must not exceed 1000 characters').optional(),
  targetUserId: z.string().uuid().optional(),
  targetProductId: z.string().uuid().optional(),
  targetReviewId: z.string().uuid().optional(),
  targetMessageId: z.string().uuid().optional(),
}).refine(
  (data) => {
    // Exactly one target must be provided
    const targets = [data.targetUserId, data.targetProductId, data.targetReviewId, data.targetMessageId]
    const definedTargets = targets.filter(t => t !== undefined)
    return definedTargets.length === 1
  },
  {
    message: 'Exactly one target (user, product, review, or message) must be specified',
    path: ['targetUserId']
  }
)

/**
 * POST /api/reports - Submit a content report
 */
async function createReportHandler(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const [data, validationError] = await validate(request, createReportSchema)
    if (validationError) return validationError

    const { type, reason, description, targetUserId, targetProductId, targetReviewId, targetMessageId } = data

    // Check for duplicate reports (same user reporting same target)
    const existingReport = await prisma.contentReport.findFirst({
      where: {
        reporterId: user.userId,
        type,
        ...(targetUserId && { targetUserId }),
        ...(targetProductId && { targetProductId }),
        ...(targetReviewId && { targetReviewId }),
        ...(targetMessageId && { targetMessageId }),
        status: { in: ['PENDING', 'INVESTIGATING'] }
      }
    })

    if (existingReport) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You have already reported this content' },
        { status: 400 }
      )
    }

    // Create the report
    const report = await prisma.contentReport.create({
      data: {
        reporterId: user.userId,
        type,
        reason,
        description,
        targetUserId,
        targetProductId,
        targetReviewId,
        targetMessageId,
        status: 'PENDING'
      }
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: report,
        message: 'Report submitted successfully. Our team will review it shortly.'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create report error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports - Get user's submitted reports
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const reports = await prisma.contentReport.findMany({
      where: { reporterId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: reports
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrf(createReportHandler)
