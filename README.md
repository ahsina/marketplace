# CryptoMarket - Anonymous Digital Marketplace

A revolutionary, privacy-focused digital marketplace powered by cryptocurrency payments. Built with Next.js 14, TypeScript, Prisma, and Tailwind CSS.

![CryptoMarket](https://img.shields.io/badge/CryptoMarket-v1.0.0-purple)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Core Functionality
- **100% Anonymous** - Only email and username required, no personal information
- **Crypto Payments** - Integrated with PayGate.io-style payment gateway
- **Digital Products** - Sell and buy all types of digital goods
- **Instant Delivery** - Automatic product delivery after payment confirmation
- **Low Fees** - Only 5% platform fee on transactions
- **Global Reach** - Worldwide marketplace with no geographical restrictions

### User Features
- **Authentication System** - Secure JWT-based authentication
- **Product Marketplace** - Browse, search, and filter products
- **Shopping Cart** - Add multiple products before checkout
- **Reviews & Ratings** - Verified purchase reviews
- **Seller Dashboard** - Manage your products and sales
- **Subscription Tiers** - Free, Basic, Premium, and Enterprise plans

### Security & Privacy
- **End-to-end encryption** for sensitive data
- **No tracking or analytics** that compromise privacy
- **Cryptocurrency payments** for maximum anonymity
- **Minimal data collection** - only essential information

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma
- **Authentication**: JWT with bcrypt
- **State Management**: Zustand
- **UI Components**: Headless UI, Lucide React
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd marketplace
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - Your database connection string
- `JWT_SECRET` - A secure secret key for JWT tokens
- `PAYGATE_API_KEY` - Your PayGate.io API credentials
- Other optional settings

4. **Generate Prisma Client**
```bash
npx prisma generate
```

5. **Run database migrations**
```bash
npx prisma migrate dev
```

6. **Start the development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see your marketplace!

## Project Structure

```
marketplace/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   └── products/       # Product endpoints
│   ├── marketplace/        # Marketplace page
│   ├── login/             # Login page
│   ├── register/          # Register page
│   └── layout.tsx         # Root layout
├── components/             # React components
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/                   # Utility libraries
│   ├── prisma.ts         # Prisma client
│   └── auth.ts           # Authentication utilities
├── store/                 # Zustand state stores
│   ├── useAuthStore.ts
│   └── useCartStore.ts
├── types/                 # TypeScript type definitions
├── utils/                 # Helper functions
├── prisma/               # Prisma schema and migrations
│   └── schema.prisma
└── public/               # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List all products (with pagination, search, filters)
- `POST /api/products` - Create new product (requires authentication)
- `GET /api/products/[id]` - Get product details
- `PUT /api/products/[id]` - Update product (seller only)
- `DELETE /api/products/[id]` - Delete product (seller only)

## Database Schema

### Core Models
- **User** - Email, username, role, subscription tier
- **Product** - Digital products with files, pricing, categories
- **Category** - Product categorization
- **Order** - Purchase transactions
- **Transaction** - Crypto payment records
- **Review** - Product reviews and ratings

## Crypto Payment Integration

The marketplace integrates with PayGate.io-style payment gateways supporting:
- Bitcoin (BTC)
- Ethereum (ETH)
- Other major cryptocurrencies

### Payment Flow
1. User adds products to cart
2. Checkout generates payment request
3. User pays with crypto wallet
4. Payment gateway confirms transaction
5. Product delivered instantly

## Deployment

### Production Checklist

1. **Database**: Migrate from SQLite to PostgreSQL
   ```bash
   # Update .env
   DATABASE_URL="postgresql://user:password@host:5432/dbname"

   # Update prisma/schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   # Run migrations
   npx prisma migrate deploy
   ```

2. **Environment Variables**: Set all production variables
   - Strong JWT secret
   - Real payment gateway credentials
   - Production database URL

3. **Build the application**
   ```bash
   npm run build
   ```

4. **Deploy to Vercel/Netlify/Your hosting**

## Security Considerations

- All passwords are hashed with bcrypt
- JWT tokens for stateless authentication
- Input validation on all API endpoints
- SQL injection protection via Prisma
- XSS protection with React

## Legal Compliance

**Important**: This marketplace is designed for **legitimate digital products only**.

### Compliance Requirements
- **Luxembourg & Dubai**: Ensure compliance with local e-commerce regulations
- **AML/KYC**: May be required depending on transaction volumes
- **Data Protection**: GDPR compliance for EU users
- **Tax Reporting**: Configure based on jurisdiction

### Prohibited Items
- Illegal goods or services
- Stolen data or credentials
- Malware or hacking tools
- Copyright-infringing content

## Roadmap

- [ ] Enhanced search with filters
- [ ] Seller analytics dashboard
- [ ] Escrow system
- [ ] Multi-language support
- [ ] Mobile optimization
- [ ] Advanced fraud detection

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

MIT License

## Support

For support: support@cryptomarket.com

## Disclaimer

This software is provided as-is for legal digital commerce. Users are responsible for ensuring compliance with all applicable laws and regulations in their jurisdiction.

---

**Built for privacy, security, and freedom**
Registered in Luxembourg & Dubai
