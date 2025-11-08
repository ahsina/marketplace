import { z } from 'zod'

/**
 * Authentication validation schemas
 */

// Password requirements: min 8 chars, at least one uppercase, one lowercase, one number
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Username: alphanumeric, underscores, hyphens, 3-30 chars
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')

// 2FA code: 6 digits
const twoFactorCodeSchema = z
  .string()
  .length(6, '2FA code must be exactly 6 digits')
  .regex(/^\d{6}$/, '2FA code must contain only digits')

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  referralCode: z.string().optional()
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: twoFactorCodeSchema.optional()
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Password reset request validation schema
 */
export const requestPasswordResetSchema = z.object({
  email: emailSchema
})

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>

/**
 * Password reset validation schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * Email verification validation schema
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

/**
 * 2FA setup validation schema
 */
export const setup2FASchema = z.object({
  code: twoFactorCodeSchema
})

export type Setup2FAInput = z.infer<typeof setup2FASchema>

/**
 * 2FA disable validation schema
 */
export const disable2FASchema = z.object({
  code: twoFactorCodeSchema
})

export type Disable2FAInput = z.infer<typeof disable2FASchema>
