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
 */

// PayGate.to API Configuration
const PAYGATE_API_BASE = process.env.PAYGATE_BASE_URL || 'https://api.paygate.to'
const PAYGATE_CHECKOUT_BASE = process.env.PAYGATE_CHECKOUT_URL || 'https://checkout.paygate.to'

// Merchant Configuration
const MERCHANT_USDC_ADDRESS = process.env.PAYGATE_MERCHANT_WALLET || process.env.PLATFORM_WALLET_ADDRESS || ''

if (!MERCHANT_USDC_ADDRESS) {
  console.warn('⚠️  PAYGATE_MERCHANT_WALLET not configured. PayGate.to payments will fail.')
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
  private apiBase: string
  private checkoutBase: string
  private merchantWallet: string

  constructor() {
    this.apiBase = PAYGATE_API_BASE
    this.checkoutBase = PAYGATE_CHECKOUT_BASE
    this.merchantWallet = MERCHANT_USDC_ADDRESS
  }

  /**
   * Create a payment wallet for an order
   */
  async createWallet(orderId: string): Promise<PayGateWallet> {
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paygate-callback`

    const params = new URLSearchParams({
      address: this.merchantWallet,
      callback: callbackUrl + `?orderId=${orderId}`,
    })

    const url = `${this.apiBase}/control/wallet.php?${params.toString()}`

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
    // First create a wallet
    const wallet = await this.createWallet(config.orderId)

    const currency = config.currency || 'USD'
    const amount = config.amount.toFixed(2)

    let paymentUrl: string

    if (config.multiProvider || !config.provider) {
      // Multi-provider selection page
      const params = new URLSearchParams({
        address: wallet.addressIn,
        amount: amount,
        currency: currency,
      })

      if (config.customerEmail) {
        params.append('email', config.customerEmail)
      }

      if (config.customDomain) {
        params.append('domain', config.customDomain)
      }

      paymentUrl = `${this.checkoutBase}/pay.php?${params.toString()}`
    } else {
      // Specific provider checkout
      const params = new URLSearchParams({
        address: wallet.addressIn,
        amount: amount,
        provider: config.provider,
        currency: currency,
      })

      if (config.customerEmail) {
        params.append('email', config.customerEmail)
      }

      paymentUrl = `${this.checkoutBase}/process-payment.php?${params.toString()}`
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
    const params = new URLSearchParams({
      ipn_token: ipnToken,
    })

    const url = `${this.apiBase}/control/payment-status.php?${params.toString()}`

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
    const params = new URLSearchParams({
      from: fromCurrency,
      value: amount.toString(),
    })

    const url = `${this.apiBase}/control/convert.php?${params.toString()}`

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
