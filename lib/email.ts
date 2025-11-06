// Email notification utilities using Resend
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.FROM_EMAIL || 'noreply@cryptomarket.local'

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    // If no API key, log to console (development mode)
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_demo_key') {
      console.log('📧 Email would be sent (set RESEND_API_KEY to actually send):')
      console.log('To:', template.to)
      console.log('Subject:', template.subject)
      console.log('---')
      return true
    }

    // Send actual email via Resend
    const data = await resend.emails.send({
      from: fromEmail,
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    if (data.error) {
      console.error('❌ Resend error:', data.error)
      return false
    }

    console.log('✅ Email sent successfully:', data.data?.id)
    return true
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return false
  }
}

// Email Templates

export function getWelcomeEmail(username: string, email: string): EmailTemplate {
  return {
    to: email,
    subject: 'Welcome to CryptoMarket!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to CryptoMarket!</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hi ${username},</p>
          <p style="font-size: 16px; color: #374151;">
            Thank you for joining CryptoMarket, the world's first completely anonymous digital marketplace!
          </p>
          <p style="font-size: 16px; color: #374151;">
            You can now:
          </p>
          <ul style="font-size: 16px; color: #374151;">
            <li>Browse thousands of digital products</li>
            <li>Buy with cryptocurrency for maximum privacy</li>
            <li>Sell your own digital products</li>
            <li>Maintain complete anonymity</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/marketplace"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Start Shopping
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            🔒 Your privacy is our priority. We only store your email and username.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>CryptoMarket - Anonymous Digital Marketplace</p>
          <p>Registered in Luxembourg & Dubai</p>
        </div>
      </div>
    `,
    text: `Welcome to CryptoMarket, ${username}! Thank you for joining our anonymous digital marketplace.`,
  }
}

export function getOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  productTitle: string,
  amount: number
): EmailTemplate {
  return {
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">Order Confirmed!</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Your order has been confirmed and is being processed.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Number</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #111827;">${orderNumber}</p>

            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Product</p>
            <p style="margin: 5px 0 15px 0; font-size: 16px; color: #111827;">${productTitle}</p>

            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Amount Paid</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #111827;">$${amount.toFixed(2)}</p>
          </div>

          <p style="font-size: 16px; color: #374151;">
            Once your payment is confirmed on the blockchain, you'll receive another email with download instructions.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              View Order Status
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>CryptoMarket - Anonymous Digital Marketplace</p>
        </div>
      </div>
    `,
    text: `Your order ${orderNumber} for ${productTitle} has been confirmed. Amount: $${amount.toFixed(2)}`,
  }
}

export function getOrderCompletedEmail(
  email: string,
  orderNumber: string,
  productTitle: string,
  downloadUrl: string
): EmailTemplate {
  return {
    to: email,
    subject: `Your Product is Ready - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">✓ Payment Confirmed!</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Great news! Your payment has been confirmed and your product is ready to download.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Number</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #111827;">${orderNumber}</p>

            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Product</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #111827;">${productTitle}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}"
               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Download Now
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            Your download link will remain active. You can always access your purchases from your Orders page.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>CryptoMarket - Anonymous Digital Marketplace</p>
        </div>
      </div>
    `,
    text: `Your order ${orderNumber} is complete! Download ${productTitle} at: ${downloadUrl}`,
  }
}

export function getNewSaleEmail(
  email: string,
  productTitle: string,
  amount: number,
  buyerUsername: string
): EmailTemplate {
  return {
    to: email,
    subject: `New Sale - ${productTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 New Sale!</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Congratulations! You just made a sale.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Product</p>
            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #111827;">${productTitle}</p>

            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Buyer</p>
            <p style="margin: 5px 0 15px 0; font-size: 16px; color: #111827;">${buyerUsername}</p>

            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Your Earnings</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #10b981;">$${amount.toFixed(2)}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              View Dashboard
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>CryptoMarket - Anonymous Digital Marketplace</p>
        </div>
      </div>
    `,
    text: `New sale! ${buyerUsername} purchased ${productTitle}. You earned $${amount.toFixed(2)}`,
  }
}

export function getEmailVerificationEmail(
  email: string,
  username: string,
  verificationToken: string
): EmailTemplate {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`

  return {
    to: email,
    subject: 'Verify Your Email - CryptoMarket',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hi ${username},</p>
          <p style="font-size: 16px; color: #374151;">
            Please verify your email address to activate your CryptoMarket account.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
            ${verificationUrl}
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>CryptoMarket - Anonymous Digital Marketplace</p>
        </div>
      </div>
    `,
    text: `Hi ${username}, please verify your email by clicking: ${verificationUrl}`,
  }
}

export function getPasswordResetEmail(
  email: string,
  username: string,
  resetToken: string
): EmailTemplate {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

  return {
    to: email,
    subject: 'Reset Your Password - CryptoMarket',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">Reset Your Password</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hi ${username},</p>
          <p style="font-size: 16px; color: #374151;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
            ${resetUrl}
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>CryptoMarket - Anonymous Digital Marketplace</p>
        </div>
      </div>
    `,
    text: `Hi ${username}, reset your password by clicking: ${resetUrl}`,
  }
}
