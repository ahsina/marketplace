import Link from 'next/link'
import { Search, HelpCircle, Book, MessageCircle, Mail } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click the "Sign Up" button in the top right corner. You only need to provide an email address and choose a username. No personal information is required.',
      },
      {
        q: 'What makes CryptoMarket anonymous?',
        a: 'We only collect your email and username - no names, addresses, phone numbers, or payment details. All transactions are done with cryptocurrency, ensuring complete privacy.',
      },
      {
        q: 'Is CryptoMarket free to use?',
        a: 'Yes! Creating an account and browsing is completely free. We only charge a small platform fee (5% for free tier) when you make a sale.',
      },
    ],
  },
  {
    category: 'Buying',
    questions: [
      {
        q: 'How do I purchase a product?',
        a: 'Browse the marketplace, add items to your cart, and proceed to checkout. Select your preferred cryptocurrency (BTC, ETH, USDT, or USDC) and complete the payment.',
      },
      {
        q: 'What cryptocurrencies do you accept?',
        a: 'We accept Bitcoin (BTC), Ethereum (ETH), Tether (USDT), and USD Coin (USDC). More cryptocurrencies coming soon!',
      },
      {
        q: 'How long does it take to receive my product?',
        a: 'Once your crypto payment is confirmed (typically 10-30 minutes), you\'ll instantly receive a download link to your email and can access the product from your Orders page.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Yes! Contact support within 7 days of purchase if you\'re not satisfied. Refunds are processed in cryptocurrency back to your wallet within 24-48 hours.',
      },
    ],
  },
  {
    category: 'Selling',
    questions: [
      {
        q: 'How do I become a seller?',
        a: 'Any user can become a seller! Simply go to your Dashboard and click "Add Product" to start listing your digital products.',
      },
      {
        q: 'What can I sell on CryptoMarket?',
        a: 'You can sell any type of digital product: software, templates, graphics, music, videos, courses, ebooks, etc. Physical products are not allowed.',
      },
      {
        q: 'What are the seller fees?',
        a: 'Fees range from 2-5% depending on your subscription tier: Free (5%), Basic (4%), Premium (3%), Enterprise (2%). This is one of the lowest in the industry!',
      },
      {
        q: 'How do I get paid?',
        a: 'Earnings are automatically sent to your crypto wallet after each successful sale. You keep 95-98% of each sale depending on your subscription tier.',
      },
      {
        q: 'Can I offer discounts on my products?',
        a: 'Yes! You can set both a regular price and a discount price when creating or editing your products.',
      },
    ],
  },
  {
    category: 'Payments & Security',
    questions: [
      {
        q: 'Is my payment secure?',
        a: 'Absolutely! All transactions are processed on the blockchain using secure smart contracts. We never store your payment information.',
      },
      {
        q: 'How do crypto payments work?',
        a: 'After checkout, you\'ll receive a unique wallet address and QR code. Send the exact amount from your crypto wallet, and once confirmed on the blockchain, your purchase is complete.',
      },
      {
        q: 'What if my payment fails?',
        a: 'If a payment fails, the order is automatically cancelled and any funds sent will be refunded to your wallet. Contact support if you need assistance.',
      },
      {
        q: 'Do you store my wallet address?',
        a: 'We only store transaction records for order history purposes. Your wallet address is not linked to your account and remains private.',
      },
    ],
  },
  {
    category: 'Account & Settings',
    questions: [
      {
        q: 'Can I change my username or email?',
        a: 'For security reasons, usernames and emails cannot be changed after registration. Contact support if you need to update your account.',
      },
      {
        q: 'How do I upgrade my subscription?',
        a: 'Visit the Pricing page or go to Settings > Subscription to view and upgrade your plan at any time.',
      },
      {
        q: 'Is two-factor authentication available?',
        a: 'Yes! Enable 2FA in your Settings > Security to add an extra layer of protection to your account.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes, you can request account deletion by contacting support. All your data will be permanently removed within 30 days.',
      },
    ],
  },
  {
    category: 'Platform Features',
    questions: [
      {
        q: 'How does the review system work?',
        a: 'Only verified buyers who have purchased a product can leave reviews. This ensures authentic, honest feedback for all products.',
      },
      {
        q: 'What is the wishlist feature?',
        a: 'Save products you\'re interested in to your wishlist for easy access later. Click the heart icon on any product to add it.',
      },
      {
        q: 'Can I message sellers directly?',
        a: 'Direct messaging is coming soon! For now, you can view seller profiles and product reviews for more information.',
      },
      {
        q: 'Is there an API for developers?',
        a: 'Premium and Enterprise subscribers get API access to integrate CryptoMarket into their own applications. View API docs in your dashboard.',
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-500 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <HelpCircle className="w-16 h-16 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-6">How Can We Help?</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto mb-8">
            Find answers to common questions or contact our support team
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:ring-4 focus:ring-purple-300 outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/contact"
              className="p-6 bg-purple-50 rounded-xl hover:bg-purple-100 transition group"
            >
              <MessageCircle className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600">
                Contact Support
              </h3>
              <p className="text-gray-600">Get help from our support team</p>
            </Link>

            <Link
              href="/about"
              className="p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition group"
            >
              <Book className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600">
                About Us
              </h3>
              <p className="text-gray-600">Learn more about CryptoMarket</p>
            </Link>

            <a
              href="mailto:support@cryptomarket.com"
              className="p-6 bg-green-50 rounded-xl hover:bg-green-100 transition group"
            >
              <Mail className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-600">
                Email Us
              </h3>
              <p className="text-gray-600">support@cryptomarket.com</p>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about CryptoMarket
            </p>
          </div>

          <div className="space-y-12">
            {faqs.map((category, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-2 h-8 bg-gradient-to-b from-purple-600 to-blue-500 rounded-full mr-3"></span>
                  {category.category}
                </h3>

                <div className="space-y-6">
                  {category.questions.map((item, qIdx) => (
                    <div key={qIdx} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        {item.q}
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-20 bg-gradient-to-br from-purple-600 to-blue-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Still Need Help?</h2>
          <p className="text-xl text-purple-100 mb-8">
            Our support team is available 24/7 to assist you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition"
            >
              Contact Support
            </Link>
            <a
              href="mailto:support@cryptomarket.com"
              className="bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-purple-800 transition border-2 border-white/20"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
