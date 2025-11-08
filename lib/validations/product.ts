import { z } from 'zod'

/**
 * Product validation schemas
 */

// Price: positive number, max 2 decimal places
const priceSchema = z
  .number()
  .positive('Price must be positive')
  .max(1000000, 'Price must not exceed $1,000,000')
  .refine((val) => Number.isFinite(val), 'Price must be a valid number')
  .refine((val) => (val * 100) % 1 === 0, 'Price can have at most 2 decimal places')

// File size: max 100MB in bytes
const fileSizeSchema = z
  .number()
  .int('File size must be an integer')
  .positive('File size must be positive')
  .max(100 * 1024 * 1024, 'File size must not exceed 100MB')

// URL validation
const urlSchema = z.string().url('Invalid URL format').max(2048, 'URL too long')

// Optional URL (can be empty string or valid URL)
const optionalUrlSchema = z
  .string()
  .max(2048, 'URL too long')
  .refine((val) => !val || z.string().url().safeParse(val).success, 'Invalid URL format')
  .optional()

// Version string (semantic versioning)
const versionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., 1.0.0)')
  .optional()

/**
 * Product creation validation schema
 */
export const createProductSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .regex(/^[a-zA-Z0-9\s\-_.()]+$/, 'Title contains invalid characters'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),

  shortDescription: z
    .string()
    .max(500, 'Short description must not exceed 500 characters')
    .optional(),

  price: priceSchema,

  discountPrice: priceSchema.optional(),

  categoryId: z
    .string()
    .uuid('Invalid category ID')
    .min(1, 'Category is required'),

  fileUrl: urlSchema,

  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long'),

  fileSize: fileSizeSchema,

  thumbnailUrl: urlSchema.optional(),

  demoUrl: optionalUrlSchema,

  tags: z
    .array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),

  currentVersion: versionSchema,

  downloadLimit: z
    .number()
    .int('Download limit must be an integer')
    .positive('Download limit must be positive')
    .max(1000, 'Download limit must not exceed 1000')
    .optional(),

  requiresLicense: z.boolean().optional(),

  drmEnabled: z.boolean().optional()
}).refine(
  (data) => {
    if (data.discountPrice && data.price) {
      return data.discountPrice < data.price
    }
    return true
  },
  {
    message: 'Discount price must be less than regular price',
    path: ['discountPrice']
  }
)

export type CreateProductInput = z.infer<typeof createProductSchema>

/**
 * Product update validation schema (all fields optional except ID)
 */
export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid('Invalid product ID')
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>

/**
 * Product search/filter validation schema
 */
export const productSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  categoryId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'price', 'downloads', 'rating']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional()
})

export type ProductSearchInput = z.infer<typeof productSearchSchema>

/**
 * Product review validation schema
 */
export const createReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must not exceed 5'),
  comment: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(1000, 'Review must not exceed 1000 characters')
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
