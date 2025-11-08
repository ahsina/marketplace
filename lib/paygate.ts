/**
 * PayGate.io Integration Service
 *
 * Real implementation for crypto payment processing
 * Supports BTC, ETH, USDT, USDC
 */

import crypto from 'crypto'

export interface PayGateConfig {
  apiKey: string
  apiSecret: string
  webhookSecret: string
  baseUrl: string
  network: 'mainnet' | 'testnet'
}

export interface CreateInvoiceRequest {
  orderId: string
  amount: number // USD amount
  currency: 'BTC' | 'ETH' | 'USDT' | 'USDC'
  description?: string
  buyerEmail?: string
  callbackUrl?: string
  returnUrl?: string
  expiryMinutes?: number
}

export interface PayGateInvoice {
  id: string
  orderId: string
  status: 'pending' | 'processing' | 'confirmed' | 'completed' | 'expired' | 'failed'
  amount: number
  currency: string
  cryptoAmount: number
  cryptoCurrency: string
  paymentAddress: string
  qrCode: string
  expiresAt: string
  createdAt: string
  confirmedAt?: string
  confirmations: number
  requiredConfirmations: number
  txHash?: string
}

export interface WebhookPayload {
  event: 'invoice.created' | 'invoice.processing' | 'invoice.confirmed' | 'invoice.completed' | 'invoice.expired'
  invoiceId: string
  orderId: string
  status: string
  txHash?: string
  confirmations?: number
  timestamp: string
}

class PayGateService {
  private config: PayGateConfig

  constructor(config: PayGateConfig) {
    this.config = config
  }

  /**
   * Create a payment invoice
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<PayGateInvoice> {
    try {
      const endpoint = `${this.config.baseUrl}/v1/invoices`

      const payload = {
        order_id: request.orderId,
        amount: request.amount,
        currency: 'USD',
        crypto_currency: request.currency,
        description: request.description || `Order ${request.orderId}`,
        buyer_email: request.buyerEmail,
        callback_url: request.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
        return_url: request.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/orders/${request.orderId}`,
        expiry_minutes: request.expiryMinutes || 60
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(`PayGate API error: ${error.message || response.statusText}`)
      }

      const data = await response.json()

      return this.mapInvoiceResponse(data)
    } catch (error) {
      console.error('PayGate createInvoice error:', error)
      throw error
    }
  }

  /**
   * Get invoice status
   */
  async getInvoice(invoiceId: string): Promise<PayGateInvoice> {
    try {
      const endpoint = `${this.config.baseUrl}/v1/invoices/${invoiceId}`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`PayGate API error: ${response.statusText}`)
      }

      const data = await response.json()

      return this.mapInvoiceResponse(data)
    } catch (error) {
      console.error('PayGate getInvoice error:', error)
      throw error
    }
  }

  /**
   * Get invoice by order ID
   */
  async getInvoiceByOrderId(orderId: string): Promise<PayGateInvoice | null> {
    try {
      const endpoint = `${this.config.baseUrl}/v1/invoices?order_id=${orderId}`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      if (data.invoices && data.invoices.length > 0) {
        return this.mapInvoiceResponse(data.invoices[0])
      }

      return null
    } catch (error) {
      console.error('PayGate getInvoiceByOrderId error:', error)
      return null
    }
  }

  /**
   * Get exchange rate
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      const endpoint = `${this.config.baseUrl}/v1/rates/${fromCurrency}/${toCurrency}`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`PayGate API error: ${response.statusText}`)
      }

      const data = await response.json()

      return data.rate || 0
    } catch (error) {
      console.error('PayGate getExchangeRate error:', error)
      // Fallback rates
      const fallbackRates: Record<string, number> = {
        'USD_BTC': 0.000023,
        'USD_ETH': 0.00044,
        'USD_USDT': 1.0,
        'USD_USDC': 1.0
      }
      return fallbackRates[`${fromCurrency}_${toCurrency}`] || 0
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex')

      return signature === expectedSignature
    } catch (error) {
      console.error('PayGate verifyWebhook error:', error)
      return false
    }
  }

  /**
   * Get payment QR code URL
   */
  getQRCodeUrl(paymentAddress: string, amount: number, currency: string): string {
    let uri = ''

    switch (currency) {
      case 'BTC':
        uri = `bitcoin:${paymentAddress}?amount=${amount}`
        break
      case 'ETH':
        uri = `ethereum:${paymentAddress}?value=${amount}`
        break
      case 'USDT':
      case 'USDC':
        uri = `ethereum:${paymentAddress}?value=${amount}`
        break
      default:
        uri = paymentAddress
    }

    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(uri)}&size=300x300`
  }

  /**
   * Get request headers
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'X-API-Secret': this.config.apiSecret
    }
  }

  /**
   * Map PayGate API response to our format
   */
  private mapInvoiceResponse(data: any): PayGateInvoice {
    return {
      id: data.id || data.invoice_id,
      orderId: data.order_id,
      status: this.normalizeStatus(data.status),
      amount: parseFloat(data.amount),
      currency: data.currency || 'USD',
      cryptoAmount: parseFloat(data.crypto_amount || data.amount_crypto),
      cryptoCurrency: data.crypto_currency || data.currency_crypto,
      paymentAddress: data.payment_address || data.address,
      qrCode: data.qr_code || this.getQRCodeUrl(
        data.payment_address || data.address,
        parseFloat(data.crypto_amount || data.amount_crypto),
        data.crypto_currency || data.currency_crypto
      ),
      expiresAt: data.expires_at || data.expiry_time,
      createdAt: data.created_at || data.created,
      confirmedAt: data.confirmed_at || data.confirmed,
      confirmations: parseInt(data.confirmations || '0'),
      requiredConfirmations: parseInt(data.required_confirmations || '3'),
      txHash: data.tx_hash || data.transaction_hash
    }
  }

  /**
   * Normalize status from PayGate to our format
   */
  private normalizeStatus(status: string): PayGateInvoice['status'] {
    const statusMap: Record<string, PayGateInvoice['status']> = {
      'new': 'pending',
      'pending': 'pending',
      'processing': 'processing',
      'confirming': 'processing',
      'confirmed': 'confirmed',
      'completed': 'completed',
      'paid': 'completed',
      'expired': 'expired',
      'cancelled': 'expired',
      'failed': 'failed'
    }

    return statusMap[status.toLowerCase()] || 'pending'
  }
}

/**
 * Initialize PayGate service
 */
export function createPayGateService(): PayGateService {
  const config: PayGateConfig = {
    apiKey: process.env.PAYGATE_API_KEY || '',
    apiSecret: process.env.PAYGATE_API_SECRET || '',
    webhookSecret: process.env.PAYGATE_WEBHOOK_SECRET || '',
    baseUrl: process.env.PAYGATE_BASE_URL || 'https://api.paygate.to',
    network: (process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet') as 'mainnet' | 'testnet'
  }

  // Validate configuration
  if (!config.apiKey || !config.apiSecret) {
    console.warn('PayGate.io credentials not configured. Payment processing will be disabled.')
  }

  return new PayGateService(config)
}

// Export singleton instance
export const paygate = createPayGateService()

/**
 * Helper: Convert USD to crypto amount
 */
export async function convertUSDToCrypto(
  usdAmount: number,
  cryptoCurrency: 'BTC' | 'ETH' | 'USDT' | 'USDC'
): Promise<number> {
  try {
    const rate = await paygate.getExchangeRate('USD', cryptoCurrency)
    return usdAmount * rate
  } catch (error) {
    console.error('Convert USD to crypto error:', error)
    return 0
  }
}

/**
 * Helper: Get supported currencies
 */
export function getSupportedCurrencies(): Array<{
  code: 'BTC' | 'ETH' | 'USDT' | 'USDC'
  name: string
  symbol: string
  decimals: number
}> {
  return [
    { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8 },
    { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', decimals: 18 },
    { code: 'USDT', name: 'Tether', symbol: '₮', decimals: 6 },
    { code: 'USDC', name: 'USD Coin', symbol: '$', decimals: 6 }
  ]
}
