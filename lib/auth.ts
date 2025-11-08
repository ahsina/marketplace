import bcrypt from 'bcryptjs'
import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'fallback-secret-key'

export interface JWTPayload {
  userId: string
  email: string
  username: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  // @ts-expect-error - TypeScript has issues with jwt.sign overloads, but this works at runtime
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}

/**
 * Check if a user is banned
 * Returns ban info if banned, null if not banned or user doesn't exist
 */
export async function checkUserBanStatus(userId: string): Promise<{
  isBanned: boolean
  reason?: string
  bannedUntil?: Date | null
  isPermanent?: boolean
} | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isBanned: true,
        banReason: true,
        bannedAt: true,
        bannedUntil: true
      }
    })

    if (!user) return null

    // If user is not banned, return early
    if (!user.isBanned) {
      return { isBanned: false }
    }

    // Check if temporary ban has expired
    if (user.bannedUntil && new Date() > user.bannedUntil) {
      // Automatically unban the user
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          bannedAt: null,
          bannedUntil: null,
          banReason: null,
          bannedBy: null
        }
      })

      return { isBanned: false }
    }

    // User is currently banned
    return {
      isBanned: true,
      reason: user.banReason || 'No reason provided',
      bannedUntil: user.bannedUntil,
      isPermanent: !user.bannedUntil
    }
  } catch (error) {
    console.error('Check ban status error:', error)
    return null
  }
}
