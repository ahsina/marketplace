import PDFDocument from 'pdfkit'

export interface InvoiceData {
  invoiceNumber: string
  orderNumber: string
  date: Date
  buyer: {
    username: string
    email: string
  }
  seller: {
    username: string
    email: string
  }
  product: {
    title: string
    price: number
  }
  totalAmount: number
  platformFee: number
  sellerAmount: number
  paymentMethod: string
  cryptoAmount?: number
  cryptoCurrency?: string
}

/**
 * Generate a PDF invoice
 */
export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Header
      doc
        .fontSize(20)
        .text('INVOICE', 50, 50, { align: 'center' })
        .fontSize(10)
        .text('CryptoMarket - Anonymous Digital Marketplace', { align: 'center' })
        .moveDown(2)

      // Invoice Info
      doc
        .fontSize(12)
        .text(`Invoice Number: ${data.invoiceNumber}`, 50, 120)
        .text(`Order Number: ${data.orderNumber}`)
        .text(`Date: ${data.date.toLocaleDateString()}`)
        .moveDown()

      // Buyer Info
      doc
        .fontSize(14)
        .text('Bill To:', 50)
        .fontSize(10)
        .text(data.buyer.username)
        .text(data.buyer.email)
        .moveDown()

      // Seller Info
      doc
        .fontSize(14)
        .text('Sold By:', 50)
        .fontSize(10)
        .text(data.seller.username)
        .text(data.seller.email)
        .moveDown(2)

      // Table Header
      const tableTop = doc.y
      doc
        .fontSize(10)
        .text('Product', 50, tableTop, { width: 250 })
        .text('Amount', 350, tableTop, { width: 100, align: 'right' })

      // Line under header
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke()

      // Product Item
      const itemY = tableTop + 25
      doc
        .fontSize(10)
        .text(data.product.title, 50, itemY, { width: 250 })
        .text(`$${data.product.price.toFixed(2)}`, 350, itemY, { width: 100, align: 'right' })

      // Totals
      const totalsY = itemY + 40
      doc
        .text('Subtotal:', 350, totalsY, { width: 100, align: 'right' })
        .text(`$${data.totalAmount.toFixed(2)}`, 450, totalsY, { width: 100, align: 'right' })

      doc
        .text('Platform Fee (5%):', 350, totalsY + 20, { width: 100, align: 'right' })
        .text(`-$${data.platformFee.toFixed(2)}`, 450, totalsY + 20, { width: 100, align: 'right' })

      doc
        .fontSize(12)
        .text('Total:', 350, totalsY + 50, { width: 100, align: 'right' })
        .text(`$${data.totalAmount.toFixed(2)}`, 450, totalsY + 50, { width: 100, align: 'right' })

      // Payment Info
      doc.moveDown(2)
      doc
        .fontSize(10)
        .text(`Payment Method: ${data.paymentMethod}`, 50)

      if (data.cryptoAmount && data.cryptoCurrency) {
        doc.text(`Crypto Amount: ${data.cryptoAmount} ${data.cryptoCurrency}`)
      }

      // Footer
      doc
        .moveDown(4)
        .fontSize(8)
        .text(
          'Thank you for using CryptoMarket! This is a computer-generated invoice.',
          50,
          doc.page.height - 100,
          { align: 'center', width: 500 }
        )
        .text(
          'For support, visit our help center or contact us through the messaging system.',
          { align: 'center', width: 500 }
        )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(orderId: string): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const shortId = orderId.slice(-8).toUpperCase()

  return `INV-${year}${month}${day}-${shortId}`
}
