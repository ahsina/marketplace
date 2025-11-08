# PayGate.io Integration Guide

Complete integration guide for PayGate.io cryptocurrency payment gateway in the Anonymous Crypto Marketplace.

## Overview

This marketplace uses PayGate.io to process real cryptocurrency payments for BTC, ETH, USDT, and USDC. The integration provides:

- Real-time invoice creation
- Blockchain confirmation tracking
- Webhook notifications for payment status updates
- Automatic exchange rate conversion
- QR code generation for easy payments
- Escrow integration for high-value orders

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Payment Flow                            │
└─────────────────────────────────────────────────────────────┘

1. User selects products and initiates checkout
   ↓
2. POST /api/payments/crypto
   - Validates order and items
   - Fetches exchange rate from PayGate
   - Creates PayGate invoice
   - Creates escrow (if order >= $100)
   - Returns payment address & QR code
   ↓
3. User sends crypto to payment address
   ↓
4. PayGate detects payment on blockchain
   ↓
5. PayGate sends webhook to /api/payments/webhook
   - Verifies webhook signature
   - Updates transaction status
   - Marks escrow as funded
   - Tracks confirmations
   ↓
6. Once confirmed (3+ confirmations):
   - Completes order
   - Generates license keys
   - Sends notifications
   - Dispatches seller webhooks
```

## Files Structure

```
lib/paygate.ts                      # PayGate.io service layer
app/api/payments/crypto/route.ts    # Payment creation endpoint
app/api/payments/webhook/route.ts   # PayGate webhook handler
```

## Environment Variables

Add these to your `.env` file:

```bash
# PayGate.io Configuration
PAYGATE_API_KEY=your_api_key_here
PAYGATE_API_SECRET=your_api_secret_here
PAYGATE_WEBHOOK_SECRET=your_webhook_secret_here

# Optional: Override default API URL
PAYGATE_BASE_URL=https://api.paygate.io

# Application URL for webhooks
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Getting PayGate.io Credentials

1. Sign up at [PayGate.io](https://paygate.io)
2. Navigate to **Settings → API Keys**
3. Generate new API credentials:
   - API Key (for authentication)
   - API Secret (for request signing)
   - Webhook Secret (for webhook verification)
4. Copy credentials to your `.env` file

**Security Notes:**
- Never commit `.env` file to version control
- Use different credentials for development/production
- Rotate secrets regularly
- Enable IP whitelisting in PayGate dashboard if available

## API Integration

### Creating a Payment

**Endpoint:** `POST /api/payments/crypto`

**Request:**
```json
{
  "productIds": ["prod_123", "prod_456"],
  "cryptoCurrency": "BTC",
  "idempotencyKey": "unique-key-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "txn_abc123",
    "invoiceId": "pg_inv_xyz789",
    "cryptoCurrency": "BTC",
    "cryptoAmount": 0.00234,
    "walletAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "qrCode": "https://api.qrserver.com/v1/create-qr-code/...",
    "expiresAt": "2024-01-15T12:00:00Z",
    "confirmations": {
      "current": 0,
      "required": 3
    }
  }
}
```

**Features:**
- Automatic USD to crypto conversion at current rates
- 60-minute payment window
- QR code for mobile wallet scanning
- Escrow creation for orders >= $100
- Idempotency protection against duplicate payments

### Webhook Handler

**Endpoint:** `POST /api/payments/webhook`

**PayGate sends webhooks for these events:**

1. **processing** - Payment detected, waiting for confirmations
2. **confirmed** - Payment confirmed (3+ confirmations)
3. **completed** - Payment fully settled
4. **expired** - Invoice expired without payment
5. **failed** - Payment failed on blockchain

**Webhook Payload:**
```json
{
  "invoice_id": "pg_inv_xyz789",
  "order_id": "order_123",
  "status": "confirmed",
  "crypto_currency": "BTC",
  "crypto_amount": 0.00234,
  "payment_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "transaction_hash": "0xabc...",
  "confirmations": 3,
  "required_confirmations": 3
}
```

**Security:**
- Verifies HMAC-SHA256 signature in `x-paygate-signature` header
- Rejects webhooks with invalid signatures
- Prevents replay attacks

## Code Examples

### Using PayGate Service

```typescript
import { paygate, convertUSDToCrypto } from '@/lib/paygate'

// Convert USD to crypto
const cryptoAmount = await convertUSDToCrypto(100, 'BTC')
console.log(`$100 = ${cryptoAmount} BTC`)

// Create an invoice
const invoice = await paygate.createInvoice({
  orderId: 'order_123',
  amount: 100,
  currency: 'BTC',
  description: 'Premium Software License',
  buyerEmail: 'buyer@example.com',
  expiryMinutes: 60
})

// Check invoice status
const status = await paygate.getInvoice(invoice.id)
console.log(`Status: ${status.status}`)
console.log(`Confirmations: ${status.confirmations}/${status.requiredConfirmations}`)

// Verify webhook signature
const isValid = paygate.verifyWebhook(
  requestBody,
  signatureHeader
)
```

### Integration with Escrow

For orders >= $100, escrow is automatically created:

```typescript
import { createEscrow, markEscrowFunded, releaseEscrow } from '@/lib/escrow'

// 1. Create escrow when order placed
const { escrowId } = await createEscrow(orderId)

// 2. Mark as funded when payment detected
await markEscrowFunded(escrowId, txHash, escrowAddress)

// 3. Release to seller when buyer confirms delivery
await releaseEscrow(escrowId)
```

## Testing

### Development Testing

1. **Use PayGate Testnet:**
   ```bash
   PAYGATE_BASE_URL=https://testnet-api.paygate.io
   ```

2. **Test Invoice Creation:**
   ```bash
   curl -X POST http://localhost:3000/api/payments/crypto \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: your-csrf-token" \
     -d '{
       "productIds": ["prod_123"],
       "cryptoCurrency": "BTC",
       "idempotencyKey": "test-123"
     }'
   ```

3. **Simulate Webhook:**
   ```bash
   # Note: You need to generate proper HMAC signature
   curl -X POST http://localhost:3000/api/payments/webhook \
     -H "Content-Type: application/json" \
     -H "x-paygate-signature: hmac-signature-here" \
     -d '{
       "invoice_id": "pg_inv_test",
       "status": "confirmed",
       "confirmations": 3
     }'
   ```

### Production Testing

1. **Small Test Transaction:**
   - Create order with minimum amount
   - Send exact crypto amount to payment address
   - Monitor logs for webhook processing

2. **Monitor Webhook Delivery:**
   ```bash
   # Check application logs
   pm2 logs marketplace | grep "PayGate webhook"

   # Check PayGate dashboard for webhook delivery status
   ```

3. **Verify Escrow Integration:**
   - Place order >= $100
   - Verify escrow creation in database
   - Confirm escrow status updates

## Error Handling

### Common Errors and Solutions

**1. "Invalid webhook signature"**
- Verify `PAYGATE_WEBHOOK_SECRET` matches PayGate dashboard
- Ensure webhook payload is not modified in transit
- Check for proxy/middleware modifying request body

**2. "Transaction not found for invoice"**
- Invoice ID mismatch between creation and webhook
- Check `gatewayResponse` field in Transaction table
- Verify invoice was created successfully

**3. "Exchange rate fetch failed"**
- PayGate API timeout or error
- Falls back to static rates in `lib/paygate.ts`
- Check PayGate service status

**4. "Payment expired"**
- User didn't send payment within 60 minutes
- Create new order and invoice
- Consider increasing `expiryMinutes` if needed

### Logging

Enable detailed logging:

```typescript
// In lib/paygate.ts
console.log('PayGate Request:', endpoint, payload)
console.log('PayGate Response:', response)

// In webhook handler
console.log(`📥 PayGate webhook: invoice ${invoiceId}, status: ${status}`)
console.log(`⏳ Payment processing: ${confirmations}/${requiredConfirmations}`)
console.log(`✅ Payment confirmed for order ${orderNumber}`)
```

## Security Best Practices

1. **Webhook Security:**
   - Always verify webhook signatures
   - Use HTTPS in production
   - Implement rate limiting on webhook endpoint
   - Log all webhook attempts

2. **API Security:**
   - Store credentials in environment variables
   - Never expose API keys in client code
   - Rotate secrets periodically
   - Use different credentials per environment

3. **Payment Security:**
   - Validate invoice amounts match order totals
   - Check transaction confirmations (minimum 3)
   - Implement idempotency for duplicate payments
   - Use escrow for high-value transactions

4. **Data Security:**
   - Encrypt sensitive data in database
   - Store transaction hashes for audit trail
   - Implement GDPR-compliant data retention
   - Regular security audits

## Monitoring

### Key Metrics to Track

1. **Payment Success Rate:**
   ```sql
   SELECT
     COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) * 100.0 / COUNT(*) as success_rate
   FROM Transaction
   WHERE createdAt > NOW() - INTERVAL '24 hours';
   ```

2. **Average Confirmation Time:**
   ```sql
   SELECT AVG(EXTRACT(EPOCH FROM (confirmedAt - createdAt))) as avg_seconds
   FROM Transaction
   WHERE status = 'CONFIRMED';
   ```

3. **Payment Method Distribution:**
   ```sql
   SELECT cryptoCurrency, COUNT(*) as count
   FROM Transaction
   GROUP BY cryptoCurrency;
   ```

### Alerts to Configure

- Payment success rate drops below 95%
- Average confirmation time exceeds 30 minutes
- Webhook delivery failures
- Exchange rate fetch errors
- Escrow auto-release failures

## Troubleshooting

### Debug Checklist

- [ ] Environment variables are set correctly
- [ ] PayGate API credentials are valid
- [ ] Webhook URL is accessible from internet
- [ ] HTTPS is enabled in production
- [ ] Database migrations are applied
- [ ] Redis is running (or graceful degradation working)
- [ ] Application logs show webhook receipts
- [ ] PayGate dashboard shows successful API calls

### Support Resources

- PayGate.io Documentation: https://docs.paygate.io
- PayGate.io API Reference: https://documenter.getpostman.com/view/14826208/2sA3Bj9aBi
- Marketplace GitHub Issues: [Your repo issues URL]
- Email Support: support@paygate.io

## Upgrade Guide

When upgrading PayGate.io integration:

1. **Check API Version:**
   ```typescript
   // Update in lib/paygate.ts if needed
   const API_VERSION = 'v1' // or v2, etc.
   ```

2. **Test in Staging:**
   - Deploy to staging environment
   - Test all payment flows
   - Verify webhook processing
   - Check error handling

3. **Monitor Production:**
   - Deploy during low-traffic period
   - Monitor error rates
   - Have rollback plan ready
   - Keep old version running temporarily

## Appendix

### Supported Cryptocurrencies

| Currency | Symbol | Network | Confirmations Required |
|----------|--------|---------|------------------------|
| Bitcoin  | BTC    | Bitcoin | 3                      |
| Ethereum | ETH    | Ethereum| 12                     |
| Tether   | USDT   | Ethereum| 12                     |
| USD Coin | USDC   | Ethereum| 12                     |

### Transaction Statuses

| Status    | Description                               | Action Required |
|-----------|-------------------------------------------|-----------------|
| PENDING   | Awaiting payment                          | User must pay   |
| CONFIRMED | Payment confirmed on blockchain           | None            |
| FAILED    | Payment failed or expired                 | Create new order|
| CANCELLED | Order cancelled before payment            | None            |

### Webhook Status Mapping

| PayGate Status | Internal Status | Order Status |
|----------------|-----------------|--------------|
| processing     | PENDING         | PROCESSING   |
| confirmed      | CONFIRMED       | COMPLETED    |
| completed      | CONFIRMED       | COMPLETED    |
| expired        | FAILED          | CANCELLED    |
| failed         | FAILED          | CANCELLED    |

---

**Last Updated:** 2024-01-15
**Integration Version:** 1.0.0
**PayGate API Version:** v1
