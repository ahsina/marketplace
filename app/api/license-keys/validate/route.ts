import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidLicenseKeyFormat, isLicenseExpired, canActivateLicense } from '@/lib/license'

// POST /api/license-keys/validate - Validate and activate a license key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, activate = false } = body

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'License key is required' },
        { status: 400 }
      )
    }

    // Check format
    if (!isValidLicenseKeyFormat(key)) {
      return NextResponse.json(
        { success: false, error: 'Invalid license key format' },
        { status: 400 }
      )
    }

    // Find license key
    const licenseKey = await prisma.licenseKey.findUnique({
      where: { key },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            currentVersion: true,
            requiresLicense: true,
            drmEnabled: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    })

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, error: 'License key not found' },
        { status: 404 }
      )
    }

    // Check if revoked
    if (licenseKey.status === 'REVOKED') {
      return NextResponse.json(
        { success: false, error: 'License key has been revoked' },
        { status: 403 }
      )
    }

    // Check if expired
    if (isLicenseExpired(licenseKey.expiresAt)) {
      // Auto-update status to EXPIRED
      await prisma.licenseKey.update({
        where: { id: licenseKey.id },
        data: { status: 'EXPIRED' }
      })

      return NextResponse.json(
        { success: false, error: 'License key has expired' },
        { status: 403 }
      )
    }

    // Check activation limit
    if (!canActivateLicense(licenseKey.activationCount, licenseKey.maxActivations)) {
      return NextResponse.json(
        { success: false, error: `License key has reached maximum activations (${licenseKey.maxActivations})` },
        { status: 403 }
      )
    }

    // If activate flag is true, increment activation count
    let updatedLicenseKey = licenseKey
    if (activate) {
      updatedLicenseKey = await prisma.licenseKey.update({
        where: { id: licenseKey.id },
        data: {
          activationCount: { increment: 1 },
          activatedAt: licenseKey.activatedAt || new Date()
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              currentVersion: true,
              requiresLicense: true,
              drmEnabled: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true
            }
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedLicenseKey,
        isValid: true,
        remainingActivations: updatedLicenseKey.maxActivations - updatedLicenseKey.activationCount
      },
      message: activate ? 'License key activated successfully' : 'License key is valid'
    })
  } catch (error) {
    console.error('Error validating license key:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate license key' },
      { status: 500 }
    )
  }
}
