import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { ApiResponse } from '@/types'

/**
 * POST /api/admin/payment-settings/test
 * Test PayGate.to connection with current settings
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const settings = await prisma.paymentSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!settings || !settings.paygateMerchantWallet) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Payment settings not configured. Please set merchant wallet address.',
        },
        { status: 400 }
      )
    }

    // Test PayGate API connection
    try {
      const testUrl = `${settings.paygateBaseUrl}/control/wallet.php?${new URLSearchParams({
        address: settings.paygateMerchantWallet,
        callback: 'https://test.example.com/callback',
      })}`

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`PayGate API returned ${response.status}`)
      }

      const data = await response.json()

      if (!data.address_in || !data.ipn_token) {
        throw new Error('Invalid PayGate API response')
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'PayGate.to connection test successful! ✅',
        data: {
          status: 'connected',
          apiUrl: settings.paygateBaseUrl,
          checkoutUrl: settings.paygateCheckoutUrl,
          merchantWallet: settings.paygateMerchantWallet,
          testMode: settings.testMode,
          testResponse: {
            encryptedAddress: data.address_in,
            ipnToken: data.ipn_token,
            polygonAddress: data.polygon_address_in,
          },
          configuration: {
            paygateEnabled: settings.paygateEnabled,
            defaultProvider: settings.defaultProvider,
            enabledProviders: settings.enabledProviders.split(','),
            supportedCurrencies: settings.supportedCurrencies.split(','),
            escrowEnabled: settings.escrowEnabled,
            escrowThreshold: settings.escrowThreshold,
          },
        },
      })
    } catch (error) {
      console.error('PayGate connection test failed:', error)

      const troubleshootingSteps = [
        'Verify wallet address is a valid Polygon address (0x...)',
        'Check that PayGate.to API is accessible',
        'Ensure wallet supports USDC on Polygon network',
        'Try again in a few moments if API is temporarily unavailable',
      ]

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `PayGate.to connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}. Troubleshooting: ${troubleshootingSteps.join('; ')}`,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Test payment settings error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to test payment settings' },
      { status: 500 }
    )
  }
}
