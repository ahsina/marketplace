import { z } from 'zod'

/**
 * Order and payment validation schemas
 */

/**
 * Order creation validation schema
 */
export const createOrderSchema = z.object({
  productIds: z
    .array(z.string().uuid('Invalid product ID'))
    .min(1, 'At least one product is required')
    .max(10, 'Maximum 10 products per order')
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

/**
 * Crypto payment creation validation schema
 */
export const createCryptoPaymentSchema = z.object({
  orderIds: z
    .array(z.string().uuid('Invalid order ID'))
    .min(1, 'At least one order is required')
    .max(10, 'Maximum 10 orders per payment'),

  cryptoCurrency: z.enum(['BTC', 'ETH', 'USDT', 'USDC'], {
    message: 'Invalid cryptocurrency. Supported: BTC, ETH, USDT, USDC'
  })
})

export type CreateCryptoPaymentInput = z.infer<typeof createCryptoPaymentSchema>

/**
 * Refund request validation schema
 */
export const createRefundSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must not exceed 1000 characters')
})

export type CreateRefundInput = z.infer<typeof createRefundSchema>

/**
 * Refund status update validation schema (admin only)
 */
export const updateRefundSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
    message: 'Invalid status. Must be PENDING, APPROVED, or REJECTED'
  }),
  adminNotes: z.string().max(1000, 'Admin notes must not exceed 1000 characters').optional()
})

export type UpdateRefundInput = z.infer<typeof updateRefundSchema>
