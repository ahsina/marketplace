# PayGate.to Integration Guide

Complete integration guide for PayGate.to fiat-to-crypto payment gateway in the Anonymous Crypto Marketplace.

## Overview

**PayGate.to** is a fiat-to-crypto on-ramp service that allows customers to pay with traditional payment methods and merchants receive instant USDC payouts on the Polygon network.

### Key Features:
- **No KYC Required** - Anonymous payment links
- **Multiple Payment Methods** - Cards, Apple Pay, Google Pay, Bank Transfers
- **Instant Payouts** - Receive USDC on Polygon within minutes
- **No Authentication** - Uses encrypted wallet addresses instead of API keys
- **Multi-Provider** - Integrates with MoonPay, Banxa, Transak, Stripe, and more
- **1% Service Fee** - Charged on final payouts
- **White-Label Support** - Custom domain branding available

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Payment Flow                            │
└─────────────────────────────────────────────────────────────┘

1. Customer selects products and initiates checkout
   ↓
2. POST /api/payments/crypto
   - Creates PayGate wallet with callback URL
   - Generates payment link
   - Stores IPN token for tracking
   ↓
3. Customer clicks payment link
   - Redirected to PayGate checkout
   - Selects provider (MoonPay, Banxa, etc.)
   - Pays with card/bank transfer
   ↓
4. Provider processes fiat payment
   - Customer completes payment
   - Provider converts to USDC
   - Sends USDC to PayGate wallet
   ↓
5. PayGate.to sends GET callback to merchant
   - Includes transaction details
   - Payout sent to merchant's Polygon wallet
   ↓
6. GET /api/payments/paygate-callback
   - Verifies payment via IPN token
   - Completes order
   - Generates license keys
   - Releases escrow (if applicable)
```

## Architecture

### Files Structure

```
lib/paygate.ts                             # PayGate.to service layer
app/api/payments/crypto/route.ts           # Payment link creation
app/api/payments/paygate-callback/route.ts # Payment callback handler
```

## Environment Variables

Add these to your `.env` file:

```bash
# PayGate.to Configuration
PAYGATE_MERCHANT_WALLET=0xYourPolygonUSDCAddress
PLATFORM_WALLET_ADDRESS=0xYourPolygonUSDCAddress  # Fallback

# Optional: Override default URLs
# PAYGATE_BASE_URL=https://api.paygate.to
# PAYGATE_CHECKOUT_URL=https://checkout.paygate.to

# Application URL for callbacks
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Setting Up Your Wallet

1. **Create a Polygon Wallet:**
   - Use MetaMask, Trust Wallet, or any Polygon-compatible wallet
   - Ensure it supports USDC on Polygon network
   - **IMPORTANT:** Keep your private keys secure

2. **Get Your Wallet Address:**
   ```
   Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6
   ```

3. **Add to Environment:**
   ```bash
   PAYGATE_MERCHANT_WALLET=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6
   ```

**Security Notes:**
- Never share your private keys
- Use a dedicated merchant wallet (separate from personal funds)
- Consider using a multi-sig wallet for large volumes
- Monitor wallet activity regularly

## API Integration

### Creating a Payment Link

**Endpoint:** `POST /api/payments/crypto`

**Request:**
```json
{
  "orderIds": ["order_123"],
  "cryptoCurrency": "USDC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "txn_abc123",
    "paymentUrl": "https://checkout.paygate.to/pay.php?address=...",
    "amount": 99.99,
    "currency": "USD",
    "payoutCurrency": "USDC",
    "payoutNetwork": "Polygon",
    "ipnToken": "tracking_token_xyz",
    "paymentMethods": [
      "Credit/Debit Card",
      "Apple Pay",
      "Google Pay",
      "Bank Transfer"
    ],
    "redirectUrl": "https://checkout.paygate.to/pay.php?...",
    "expiresAt": "2024-01-16T12:00:00Z"
  }
}
```

**Frontend Integration:**
```typescript
// Redirect user to payment page
window.location.href = response.data.redirectUrl

// Or open in new tab
window.open(response.data.redirectUrl, '_blank')
```

### Callback Handler

**Endpoint:** `GET /api/payments/paygate-callback`

**Callback Parameters:**
```
?orderId=order_123
&value_coin=99.50
&coin=polygon_usdc
&txid_in=0xabc...  (provider to PayGate)
&txid_out=0xdef... (PayGate to merchant)
&address_in=0xwallet...
```

**Process:**
1. Verify payment via IPN token lookup
2. Update transaction status to CONFIRMED
3. Complete order and generate license keys
4. Update escrow status (if applicable)
5. Send buyer notification
6. Dispatch seller webhook

## Code Examples

### Using PayGate Service

```typescript
import { paygate } from '@/lib/paygate'

// Create a payment link
const paymentLink = await paygate.createPaymentLink({
  orderId: 'order_123',
  amount: 99.99,
  currency: 'USD',
  customerEmail: 'buyer@example.com',
  multiProvider: true, // Show provider selection
})

console.log('Payment URL:', paymentLink.url)
console.log('IPN Token:', paymentLink.ipnToken)

// Check payment status
const status = await paygate.checkPaymentStatus(paymentLink.ipnToken)
console.log('Status:', status.status) // 'paid' or 'unpaid'
console.log('Amount:', status.valueCoin) // Actual USDC received

// Convert currency
const conversion = await paygate.convertCurrency(100, 'EUR')
console.log(`€100 = ${conversion.valueCoin} USDC`)
```

### Integration with Escrow

For high-value orders (>= $100), escrow is automatically created:

```typescript
import { createEscrow, markEscrowFunded, releaseEscrow } from '@/lib/escrow'

// 1. Create escrow when order placed
const { escrowId } = await createEscrow(orderId)

// 2. Mark as funded when callback received
await markEscrowFunded(escrowId, txHash, walletAddress)

// 3. Auto-release or wait for buyer confirmation
await releaseEscrow(escrowId)
```

## Supported Payment Providers

PayGate.to integrates with multiple providers:

| Provider | Cards | Apple Pay | Google Pay | Bank Transfer | Regions |
|----------|-------|-----------|------------|---------------|---------|
| MoonPay  | ✅     | ✅         | ✅          | ✅             | Global  |
| Banxa    | ✅     | ✅         | ✅          | ✅             | 100+ countries |
| Transak  | ✅     | ✅         | ✅          | ✅             | 160+ countries |
| Stripe   | ✅     | ✅         | ✅          | ❌             | Global  |

**Multi-Provider Mode:**
- Shows provider selection page to customer
- Customer chooses best rates/payment method
- Automatic routing to selected provider

**Single-Provider Mode:**
```typescript
await paygate.createPaymentLink({
  orderId: 'order_123',
  amount: 100,
  provider: 'moonpay', // Direct to MoonPay
  multiProvider: false,
})
```

## Testing

### Development Testing

1. **Configure Test Wallet:**
   ```bash
   # Use a testnet wallet or small-amount wallet
   PAYGATE_MERCHANT_WALLET=0xYourTestWallet
   ```

2. **Create Test Payment:**
   ```bash
   curl -X POST http://localhost:3000/api/payments/crypto \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: your-csrf-token" \
     -H "Authorization: Bearer your-jwt-token" \
     -d '{
       "orderIds": ["order_123"],
       "cryptoCurrency": "USDC"
     }'
   ```

3. **Manual Callback Test:**
   ```bash
   curl "http://localhost:3000/api/payments/paygate-callback?orderId=order_123&value_coin=10.00&coin=polygon_usdc&txid_out=0xtest&address_in=0xtest"
   ```

### Production Testing

1. **Small Test Transaction:**
   - Create order with minimum amount ($5-10)
   - Complete payment with real card
   - Monitor callback delivery
   - Verify USDC received in wallet

2. **Check Polygon Transaction:**
   ```
   https://polygonscan.com/tx/[txid_out]
   ```

3. **Monitor Application Logs:**
   ```bash
   pm2 logs marketplace | grep "PayGate"
   ```

## Error Handling

### Common Errors and Solutions

**1. "PAYGATE_MERCHANT_WALLET not configured"**
- Set your Polygon USDC wallet address in environment variables
- Ensure wallet supports Polygon network, not Ethereum mainnet

**2. "Failed to create payment wallet"**
- Check PayGate.to API is accessible
- Verify callback URL is publicly accessible (not localhost)
- Check firewall/network settings

**3. "Transaction not found for order"**
- Callback received before transaction created
- Order ID mismatch
- Check transaction records in database

**4. "Payment not confirmed"**
- IPN token verification failed
- Payment still processing
- Check payment status manually via IPN token

### Callback Verification

Unlike traditional APIs, PayGate.to doesn't use webhook signatures. Instead, verify callbacks by:

```typescript
// Verify via IPN token
const isValid = await paygate.verifyCallback(ipnToken)
if (!isValid) {
  throw new Error('Payment not confirmed')
}
```

## Security Best Practices

1. **Wallet Security:**
   - Use dedicated merchant wallet
   - Consider multi-sig for large volumes
   - Regular security audits
   - Monitor for unusual transactions

2. **Callback Security:**
   - Always verify via IPN token
   - Check payment amounts match orders
   - Implement idempotency for duplicate callbacks
   - Log all callback attempts

3. **Data Security:**
   - Store transaction hashes for audit trail
   - Encrypt sensitive customer data
   - GDPR-compliant data retention
   - Regular database backups

4. **Network Security:**
   - Use HTTPS in production
   - Whitelist callback IPs if possible
   - Rate limit callback endpoint
   - DDoS protection

## Monitoring

### Key Metrics to Track

1. **Payment Success Rate:**
   ```sql
   SELECT
     COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) * 100.0 / COUNT(*) as success_rate
   FROM Transaction
   WHERE paymentGateway = 'paygate'
   AND createdAt > NOW() - INTERVAL '24 hours';
   ```

2. **Average Settlement Time:**
   ```sql
   SELECT AVG(EXTRACT(EPOCH FROM (confirmedAt - createdAt))) / 60 as avg_minutes
   FROM Transaction
   WHERE paymentGateway = 'paygate'
   AND status = 'CONFIRMED';
   ```

3. **Payout Distribution:**
   ```sql
   SELECT
     JSON_EXTRACT(gatewayResponse, '$.callback.coin') as coin,
     COUNT(*) as count,
     SUM(cryptoAmount) as total
   FROM Transaction
   WHERE paymentGateway = 'paygate'
   GROUP BY coin;
   ```

### Alerts to Configure

- Payment success rate drops below 90%
- No callbacks received in 1 hour
- Wallet balance below threshold
- Abnormal payout amounts
- Failed callback verifications

## Advanced Features

### Affiliate Program

Create affiliate wallets to share revenue:

```typescript
// Create affiliate wallet (10% commission)
const affiliateWallet = await fetch(
  'https://api.paygate.to/control/affiliate.php?' +
  new URLSearchParams({
    address: merchantWallet,
    callback: callbackUrl,
    affiliate: affiliateWallet, // Receives 10% in USDC
  })
)
```

### Custom Commission

```typescript
// Custom split: 90% merchant, 10% affiliate
const customWallet = await fetch(
  'https://api.paygate.to/control/custom-affiliate.php?' +
  new URLSearchParams({
    address: merchantWallet,
    callback: callbackUrl,
    affiliate: affiliateWallet,
    affiliate_fee: '0.10', // 10%
    merchant_fee: '0.89',  // 89% (1% PayGate fee)
  })
)
```

### White-Label Branding

```typescript
const paymentLink = await paygate.createPaymentLink({
  orderId: 'order_123',
  amount: 100,
  customDomain: 'pay.yourstore.com', // Custom branded domain
})
```

## Troubleshooting

### Debug Checklist

- [ ] Polygon wallet address configured correctly
- [ ] Wallet supports USDC on Polygon (not ETH mainnet)
- [ ] Callback URL is publicly accessible
- [ ] HTTPS enabled in production
- [ ] Database has transaction records
- [ ] Application logs show payment link creation
- [ ] Check Polygonscan for payout transactions

### Polygon Network Details

- **Network Name:** Polygon (Matic)
- **Chain ID:** 137
- **Currency:** MATIC
- **RPC URL:** https://polygon-rpc.com
- **Block Explorer:** https://polygonscan.com
- **USDC Contract:** 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

### Support Resources

- PayGate.to Documentation: https://documenter.getpostman.com/view/14826208/2sA3Bj9aBi
- Polygon Network: https://polygon.technology
- Polygonscan: https://polygonscan.com
- USDC on Polygon: https://www.circle.com/en/usdc-multichain/polygon

## FAQ

**Q: Do customers need a crypto wallet?**
A: No! Customers pay with credit cards or bank transfers. Only the merchant needs a crypto wallet.

**Q: How fast are payouts?**
A: Usually within 5-15 minutes after customer payment is confirmed.

**Q: What fees are charged?**
A: PayGate.to charges 1% on payouts. Provider fees (MoonPay, Banxa, etc.) are paid by the customer.

**Q: Can I receive payments in currencies other than USD?**
A: Yes! PayGate.to supports USD, EUR, CAD, GBP, INR, and more.

**Q: What if the payout fails?**
A: PayGate.to will retry payouts automatically. Check transaction status via IPN token.

**Q: Can I withdraw USDC to fiat?**
A: Yes, use exchanges like Coinbase, Binance, or Kraken to convert USDC to fiat and withdraw to your bank.

## Migration from Other Gateways

If migrating from CoinPayments, BTCPay, or similar:

1. Update payment creation to use PayGate links
2. Replace crypto address generation with `createPaymentLink()`
3. Change POST webhook to GET callback handler
4. Update frontend to redirect to PayGate checkout
5. Test with small amounts
6. Monitor callback delivery
7. Update customer communication

---

**Last Updated:** 2024-01-15
**Integration Version:** 2.0.0 (Corrected)
**PayGate.to API:** v1
**Payment Flow:** Fiat-to-Crypto
**Payout Currency:** USDC (Polygon)
