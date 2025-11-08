import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { z } from 'zod'
import { clearPaymentSettingsCache } from '@/lib/paygate'

/**
 * Payment Settings Validation Schema
 */
const paymentSettingsSchema = z.object({
  // PayGate.to Configuration
  paygateEnabled: z.boolean().optional(),
  paygateMerchantWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Polygon wallet address').optional().nullable(),
  paygateBaseUrl: z.string().url().optional(),
  paygateCheckoutUrl: z.string().url().optional(),

  // Payment Provider Settings
  defaultProvider: z.enum(['MOONPAY', 'BANXA', 'TRANSAK', 'STRIPE', 'MULTI_PROVIDER']).optional(),
  enabledProviders: z.string().optional(),

  // Payment Methods
  enableCreditCard: z.boolean().optional(),
  enableApplePay: z.boolean().optional(),
  enableGooglePay: z.boolean().optional(),
  enableBankTransfer: z.boolean().optional(),

  // Currency Settings
  supportedCurrencies: z.string().optional(),
  defaultCurrency: z.string().min(3).max(3).optional(),

  // Fee Configuration
  platformFeePercentage: z.number().min(0).max(100).optional(),
  paygateFeePercentage: z.number().min(0).max(100).optional(),
  minimumOrderAmount: z.number().min(0).optional(),
  maximumOrderAmount: z.number().min(0).optional(),

  // Escrow Settings
  escrowEnabled: z.boolean().optional(),
  escrowThreshold: z.number().min(0).optional(),
  escrowAutoReleaseHours: z.number().min(1).max(720).optional(),

  // Advanced Settings
  testMode: z.boolean().optional(),
  customDomain: z.string().url().optional().nullable(),
  callbackUrl: z.string().url().optional().nullable(),

  // Affiliate Settings
  affiliateEnabled: z.boolean().optional(),
  affiliateWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
  affiliateFeePercentage: z.number().min(0).max(100).optional(),

  // Metadata
  notes: z.string().optional().nullable(),
})

/**
 * GET /api/admin/payment-settings
 * Get current payment settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create payment settings
    let settings = await prisma.paymentSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!settings) {
      // Create default settings
      settings = await prisma.paymentSettings.create({
        data: {
          // Use env variable as fallback for initial setup
          paygateMerchantWallet: process.env.PAYGATE_MERCHANT_WALLET || process.env.PLATFORM_WALLET_ADDRESS || null,
        },
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Get payment settings error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to get payment settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/payment-settings
 * Update payment settings
 */
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validation = paymentSettingsSchema.safeParse(body)
    if (!validation.success) {
      const errorMessages = validation.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Validation failed: ${errorMessages}`,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Validate wallet address is set if PayGate is enabled
    if (data.paygateEnabled && !data.paygateMerchantWallet) {
      const currentSettings = await prisma.paymentSettings.findFirst({
        orderBy: { createdAt: 'desc' },
      })

      if (!currentSettings?.paygateMerchantWallet) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Merchant wallet address is required when PayGate is enabled',
          },
          { status: 400 }
        )
      }
    }

    // Validate escrow threshold
    if (data.escrowThreshold !== undefined && data.minimumOrderAmount !== undefined) {
      if (data.escrowThreshold < data.minimumOrderAmount) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Escrow threshold must be greater than or equal to minimum order amount',
          },
          { status: 400 }
        )
      }
    }

    // Get or create settings
    let settings = await prisma.paymentSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!settings) {
      // Create new settings
      settings = await prisma.paymentSettings.create({
        data: {
          ...data,
          updatedBy: user.userId,
        },
      })
    } else {
      // Update existing settings
      settings = await prisma.paymentSettings.update({
        where: { id: settings.id },
        data: {
          ...data,
          updatedBy: user.userId,
          updatedAt: new Date(),
        },
      })
    }

    console.log(`✅ Payment settings updated by admin ${user.userId}`)

    // Clear settings cache to force reload
    clearPaymentSettingsCache()

    return NextResponse.json<ApiResponse>({
      success: true,
      data: settings,
      message: 'Payment settings updated successfully',
    })
  } catch (error) {
    console.error('Update payment settings error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update payment settings' },
      { status: 500 }
    )
  }
}

