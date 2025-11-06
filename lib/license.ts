import crypto from 'crypto'

/**
 * Generate a unique license key
 * Format: XXXX-XXXX-XXXX-XXXX-XXXX (25 characters including dashes)
 */
export function generateLicenseKey(): string {
  const segments = []

  for (let i = 0; i < 5; i++) {
    const segment = crypto.randomBytes(2).toString('hex').toUpperCase()
    segments.push(segment)
  }

  return segments.join('-')
}

/**
 * Validate license key format
 */
export function isValidLicenseKeyFormat(key: string): boolean {
  const pattern = /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/
  return pattern.test(key)
}

/**
 * Check if license key is expired
 */
export function isLicenseExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date() > expiresAt
}

/**
 * Check if license key can be activated
 */
export function canActivateLicense(activationCount: number, maxActivations: number): boolean {
  return activationCount < maxActivations
}
