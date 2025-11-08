import { z } from 'zod'

/**
 * Validation schemas for admin bulk actions
 */

export const bulkBanUsersSchema = z.object({
  userIds: z
    .array(z.string().cuid('Invalid user ID format'))
    .min(1, 'At least one user ID required')
    .max(100, 'Maximum 100 users per bulk action'),
  reason: z
    .string()
    .min(5, 'Ban reason must be at least 5 characters')
    .max(500, 'Ban reason must not exceed 500 characters'),
  duration: z
    .number()
    .int()
    .positive('Duration must be positive')
    .max(365, 'Maximum ban duration is 365 days')
    .optional() // null = permanent ban
})

export const bulkUnbanUsersSchema = z.object({
  userIds: z
    .array(z.string().cuid('Invalid user ID format'))
    .min(1, 'At least one user ID required')
    .max(100, 'Maximum 100 users per bulk action')
})

export const bulkApproveProductsSchema = z.object({
  productIds: z
    .array(z.string().cuid('Invalid product ID format'))
    .min(1, 'At least one product ID required')
    .max(50, 'Maximum 50 products per bulk action')
})

export const bulkRejectProductsSchema = z.object({
  productIds: z
    .array(z.string().cuid('Invalid product ID format'))
    .min(1, 'At least one product ID required')
    .max(50, 'Maximum 50 products per bulk action'),
  reason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason must not exceed 500 characters')
})

export const bulkResolveReportsSchema = z.object({
  reportIds: z
    .array(z.string().cuid('Invalid report ID format'))
    .min(1, 'At least one report ID required')
    .max(100, 'Maximum 100 reports per bulk action'),
  action: z.enum(['RESOLVED', 'DISMISSED'], {
    message: 'Action must be either RESOLVED or DISMISSED'
  }),
  resolution: z
    .string()
    .min(10, 'Resolution must be at least 10 characters')
    .max(500, 'Resolution must not exceed 500 characters')
    .optional()
})

export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().cuid('Invalid ID format'))
    .min(1, 'At least one ID required')
    .max(100, 'Maximum 100 items per bulk action'),
  type: z.enum(['REVIEW', 'MESSAGE', 'REPORT'], {
    message: 'Invalid deletion type'
  }),
  reason: z
    .string()
    .min(5, 'Deletion reason must be at least 5 characters')
    .max(500, 'Deletion reason must not exceed 500 characters')
})

export const bulkUpdateProductStatusSchema = z.object({
  productIds: z
    .array(z.string().cuid('Invalid product ID format'))
    .min(1, 'At least one product ID required')
    .max(50, 'Maximum 50 products per bulk action'),
  isActive: z.boolean()
})

export const bulkAssignTicketsSchema = z.object({
  ticketIds: z
    .array(z.string().cuid('Invalid ticket ID format'))
    .min(1, 'At least one ticket ID required')
    .max(50, 'Maximum 50 tickets per bulk action'),
  assignedTo: z.string().cuid('Invalid admin user ID')
})

export const bulkCloseTicketsSchema = z.object({
  ticketIds: z
    .array(z.string().cuid('Invalid ticket ID format'))
    .min(1, 'At least one ticket ID required')
    .max(50, 'Maximum 50 tickets per bulk action'),
  resolution: z
    .string()
    .min(10, 'Resolution must be at least 10 characters')
    .max(500, 'Resolution must not exceed 500 characters')
    .optional()
})
