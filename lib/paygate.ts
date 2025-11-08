/**
 * PayGate.to Integration
 *
 * PayGate.to is a fiat-to-crypto payment gateway that allows customers to pay with:
 * - Credit/Debit Cards
 * - Apple Pay / Google Pay
 * - Bank Transfers
 *
 * Merchants receive instant USDC payouts on Polygon network.
 *
 * API Documentation: https://documenter.getpostman.com/view/14826208/2sA3Bj9aBi
 *
 * Settings are now managed via admin dashboard and stored in database.
 * Environment variables are used as fallback for backwards compatibility.
 */

import { prisma } from './prisma'

// Settings cache to avoid database queries on every request
let settingsCache: {
  data: any | null
  timestamp: number
  ttl: number
} = {
  data: null,
  timestamp: 0,
  ttl: 60000, // Cache for 1 minute
}

/**
 * Get payment settings from database (with caching)
 */
async function getPaymentSettings() {
  const now = Date.now()

  // Return cached settings if still valid
  if (settingsCache.data && now - settingsCache.timestamp < settingsCache.ttl) {
    return settingsCache.data
  }

  // Fetch from database
  try {
    const settings = await prisma.paymentSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (settings) {
      // Update cache
      settingsCache.data = settings
      settingsCache.timestamp = now
      return settings
    }
  } catch (error) {
    console.error('Failed to fetch payment settings from database:', error)
  }

  // Fallback to environment variables
  const fallbackSettings = {
    paygateEnabled: true,
    paygateMerchantWallet: process.env.PAYGATE_MERCHANT_WALLET || process.env.PLATFORM_WALLET_ADDRESS || '',
    paygateBaseUrl: process.env.PAYGATE_BASE_URL || 'https://api.paygate.to',
    paygateCheckoutUrl: process.env.PAYGATE_CHECKOUT_URL || 'https://checkout.paygate.to',
    defaultProvider: 'MULTI_PROVIDER' as const,
    enabledProviders: 'moonpay,banxa,transak,stripe',
    testMode: false,
    customDomain: null,
    callbackUrl: null,
  }

  // Cache fallback settings
  settingsCache.data = fallbackSettings
  settingsCache.timestamp = now

  if (!fallbackSettings.paygateMerchantWallet) {
    console.warn('⚠️  Payment settings not configured. Please configure via admin dashboard.')
  }

  return fallbackSettings
}

/**
 * PayGate Wallet Response
 */
export interface PayGateWallet {
  addressIn: string // Encrypted wallet address for payments
  polygonAddressIn: string // Polygon address
  callbackUrl: string
  ipnToken: string // Token for tracking payment status
}

/**
 * Payment Link Configuration
 */
export interface PaymentLinkConfig {
  orderId: string
  amount: number // USD amount
  currency?: string // USD, EUR, CAD, etc.
  customerEmail?: string
  provider?: 'moonpay' | 'banxa' | 'transak' | 'stripe' // Specific provider
  multiProvider?: boolean // Show provider selection
  customDomain?: string // White-label domain
}

/**
 * Payment Link Response
 */
export interface PaymentLink {
  url: string // Payment page URL
  encryptedAddress: string
  ipnToken: string
  amount: number
  currency: string
}

/**
 * Payment Status Response
 */
export interface PaymentStatus {
  status: 'paid' | 'unpaid'
  valueCoin: string // USDC amount received
  txidOut: string // Payout transaction hash
  coin: 'polygon_usdc' | 'polygon_usdt'
}

/**
 * Callback Payload (sent via GET request)
 */
export interface PayGateCallback {
  orderId: string
  valueCoin: string // Actual USDC received
  coin: 'polygon_usdc' | 'polygon_usdt'
  txidIn: string // Provider to wallet tx
  txidOut: string // Wallet to merchant tx
  addressIn: string // Decrypted wallet address
  [key: string]: string // Any additional params
}

/**
 * Currency Conversion Response
 */
export interface ConversionResult {
  status: 'success' | 'error'
  valueCoin: string
  exchangeRate: string
}

/**
 * PayGate.to Service
 */
class PayGateService {
  /**
   * Create a payment wallet for an order
   */
  async createWallet(orderId: string): Promise<PayGateWallet> {
    const settings = await getPaymentSettings()

    if (!settings.paygateEnabled) {
      throw new Error('PayGate.to is currently disabled')
    }

    if (!settings.paygateMerchantWallet) {
      throw new Error('Merchant wallet not configured. Please configure payment settings in admin dashboard.')
    }

    const callbackUrl = settings.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paygate-callback`

    const params = new URLSearchParams({
      address: settings.paygateMerchantWallet,
      callback: callbackUrl + `?orderId=${orderId}`,
    })

    const url = `${settings.paygateBaseUrl}/control/wallet.php?${params.toString()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`PayGate API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        addressIn: data.address_in,
        polygonAddressIn: data.polygon_address_in,
        callbackUrl: data.callback_url,
        ipnToken: data.ipn_token,
      }
    } catch (error) {
      console.error('Failed to create PayGate wallet:', error)
      throw new Error('Failed to create payment wallet')
    }
  }

  /**
   * Generate a payment link for customer checkout
   */
  async createPaymentLink(config: PaymentLinkConfig): Promise<PaymentLink> {
    const settings = await getPaymentSettings()

    if (!settings.paygateEnabled) {
      throw new Error('PayGate.to is currently disabled')
    }

    // First create a wallet
    const wallet = await this.createWallet(config.orderId)

    const currency = config.currency || settings.defaultCurrency || 'USD'
    const amount = config.amount.toFixed(2)

    // Determine provider mode
    const useMultiProvider = config.multiProvider ?? (settings.defaultProvider === 'MULTI_PROVIDER')
    const provider = config.provider || (useMultiProvider ? null : settings.defaultProvider?.toLowerCase())

    let paymentUrl: string

    if (useMultiProvider || !provider) {
      // Multi-provider selection page
      const params = new URLSearchParams({
        address: wallet.addressIn,
        amount: amount,
        currency: currency,
      })

      if (config.customerEmail) {
        params.append('email', config.customerEmail)
      }

      const customDomain = config.customDomain || settings.customDomain
      if (customDomain) {
        params.append('domain', customDomain)
      }

      paymentUrl = `${settings.paygateCheckoutUrl}/pay.php?${params.toString()}`
    } else {
      // Specific provider checkout
      const params = new URLSearchParams({
        address: wallet.addressIn,
        amount: amount,
        provider: provider,
        currency: currency,
      })

      if (config.customerEmail) {
        params.append('email', config.customerEmail)
      }

      paymentUrl = `${settings.paygateCheckoutUrl}/process-payment.php?${params.toString()}`
    }

    return {
      url: paymentUrl,
      encryptedAddress: wallet.addressIn,
      ipnToken: wallet.ipnToken,
      amount: config.amount,
      currency: currency,
    }
  }

  /**
   * Check payment status using IPN token
   */
  async checkPaymentStatus(ipnToken: string): Promise<PaymentStatus> {
    const settings = await getPaymentSettings()

    const params = new URLSearchParams({
      ipn_token: ipnToken,
    })

    const url = `${settings.paygateBaseUrl}/control/payment-status.php?${params.toString()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`PayGate API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        status: data.status,
        valueCoin: data.value_coin,
        txidOut: data.txid_out,
        coin: data.coin,
      }
    } catch (error) {
      console.error('Failed to check payment status:', error)
      throw new Error('Failed to check payment status')
    }
  }

  /**
   * Convert currency to USDC
   */
  async convertCurrency(amount: number, fromCurrency: string = 'USD'): Promise<ConversionResult> {
    const settings = await getPaymentSettings()

    const params = new URLSearchParams({
      from: fromCurrency,
      value: amount.toString(),
    })

    const url = `${settings.paygateBaseUrl}/control/convert.php?${params.toString()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`PayGate API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        status: data.status,
        valueCoin: data.value_coin,
        exchangeRate: data.exchange_rate,
      }
    } catch (error) {
      console.error('Failed to convert currency:', error)
      // Return fallback conversion (1:1 for USD)
      return {
        status: 'error',
        valueCoin: amount.toString(),
        exchangeRate: '1.0',
      }
    }
  }

  /**
   * Parse callback parameters from GET request
   */
  parseCallback(searchParams: URLSearchParams): PayGateCallback {
    return {
      orderId: searchParams.get('orderId') || '',
      valueCoin: searchParams.get('value_coin') || '',
      coin: (searchParams.get('coin') as 'polygon_usdc' | 'polygon_usdt') || 'polygon_usdc',
      txidIn: searchParams.get('txid_in') || '',
      txidOut: searchParams.get('txid_out') || '',
      addressIn: searchParams.get('address_in') || '',
      // Include all other parameters
      ...Object.fromEntries(searchParams.entries()),
    }
  }

  /**
   * Verify callback authenticity
   * Note: PayGate.to doesn't use signature verification, but we can validate
   * by checking the payment status with the IPN token
   */
  async verifyCallback(ipnToken: string): Promise<boolean> {
    try {
      const status = await this.checkPaymentStatus(ipnToken)
      return status.status === 'paid'
    } catch (error) {
      console.error('Failed to verify callback:', error)
      return false
    }
  }
}

// Export singleton instance
export const paygate = new PayGateService()

// Export helper function for backwards compatibility
export async function createPaymentLink(
  orderId: string,
  amount: number,
  customerEmail?: string
): Promise<PaymentLink> {
  return paygate.createPaymentLink({
    orderId,
    amount,
    customerEmail,
    multiProvider: true, // Show provider selection
  })
}

/**
 * Clear payment settings cache
 * Call this after updating settings in admin dashboard
 */
export function clearPaymentSettingsCache() {
  settingsCache.data = null
  settingsCache.timestamp = 0
  console.log('✅ Payment settings cache cleared')
}

/**
 * Get current payment settings (for admin dashboard)
 */
export async function getCurrentPaymentSettings() {
  return await getPaymentSettings()
}
