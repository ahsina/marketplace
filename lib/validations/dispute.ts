import { z } from 'zod'

/**
 * Validation schemas for dispute operations
 */

export const createDisputeSchema = z.object({
  orderId: z.string().cuid('Invalid order ID format'),
  reason: z.enum([
    'PRODUCT_NOT_AS_DESCRIBED',
    'FILE_CORRUPTED',
    'WRONG_PRODUCT',
    'NOT_RECEIVED',
    'SELLER_NOT_RESPONDING',
    'REFUND_NOT_PROCESSED',
    'LICENSE_ISSUE',
    'OTHER'
  ], {
    message: 'Invalid dispute reason'
  }),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  buyerEvidence: z
    .array(z.string().url('Invalid evidence URL'))
    .max(5, 'Maximum 5 evidence files')
    .optional()
})

export const addDisputeMessageSchema = z.object({
  message: z
    .string()
    .min(5, 'Message must be at least 5 characters')
    .max(1000, 'Message must not exceed 1000 characters'),
  attachments: z
    .array(z.string().url('Invalid attachment URL'))
    .max(3, 'Maximum 3 attachments')
    .optional(),
  isInternal: z.boolean().optional().default(false)
})

export const addEvidenceSchema = z.object({
  evidence: z
    .array(z.string().url('Invalid evidence URL'))
    .min(1, 'At least one evidence file required')
    .max(5, 'Maximum 5 evidence files')
})

export const resolveDisputeSchema = z.object({
  outcome: z.enum([
    'BUYER_FAVOR',
    'SELLER_FAVOR',
    'PARTIAL_REFUND',
    'FULL_REFUND',
    'NO_REFUND',
    'REPLACE_PRODUCT'
  ], {
    message: 'Invalid dispute outcome'
  }),
  resolution: z
    .string()
    .min(20, 'Resolution explanation must be at least 20 characters')
    .max(2000, 'Resolution explanation must not exceed 2000 characters'),
  refundAmount: z
    .number()
    .positive('Refund amount must be positive')
    .optional()
})

export const assignDisputeSchema = z.object({
  assignedTo: z.string().cuid('Invalid admin user ID')
})

export const escalateDisputeSchema = z.object({
  reason: z
    .string()
    .min(20, 'Escalation reason must be at least 20 characters')
    .max(500, 'Escalation reason must not exceed 500 characters')
})
