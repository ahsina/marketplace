# CryptoMarket - Deployment Guide

Complete guide for deploying your anonymous crypto marketplace to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Deployment (Vercel)](#quick-deployment-vercel)
3. [Alternative Platforms](#alternative-platforms)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Checklist](#post-deployment-checklist)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before deploying, ensure you have:

- [ ] GitHub account (for code repository)
- [ ] Vercel/Railway/Heroku account
- [ ] PostgreSQL database (Neon, Supabase, or Railway)
- [ ] Redis instance (Upstash recommended)
- [ ] Cloudinary account (file uploads)
- [ ] Resend account (email delivery)
- [ ] Domain name (optional but recommended)

---

## 🚀 Quick Deployment (Vercel)

Vercel is recommended for Next.js applications.

### Step 1: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/cryptomarket.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=...
FROM_EMAIL=noreply@yourdomain.com
REDIS_URL=rediss://...
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional
PAYGATE_API_KEY=...
PAYGATE_API_SECRET=...
PAYGATE_WEBHOOK_SECRET=...
```

### Step 4: Deploy

```bash
# Vercel CLI (optional)
npm i -g vercel
vercel --prod
```

---

## 🌐 Alternative Platforms

### Railway

**Pros:** Built-in PostgreSQL + Redis, simple setup
**Cost:** $5/month minimum

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add --service postgresql

# Add Redis
railway add --service redis

# Deploy
railway up

# Set environment variables
railway variables set JWT_SECRET=your-secret
```

### Heroku

**Pros:** Easy deployment, mature platform
**Cost:** $7/month for hobby tier

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

### Digital Ocean App Platform

**Pros:** Full control, predictable pricing
**Cost:** $12/month minimum

1. Create account at [digitalocean.com](https://www.digitalocean.com)
2. Go to Apps → Create App
3. Connect GitHub repository
4. Add PostgreSQL database ($15/month)
5. Add Redis ($15/month)
6. Configure environment variables
7. Deploy

---

## 🗄️ Database Setup

### Option 1: Neon (Recommended - Serverless)

**Free Tier:** 0.5 GB storage, 10 GB transfer/month

```bash
# 1. Sign up at neon.tech
# 2. Create new project
# 3. Copy connection string
# 4. Add to DATABASE_URL

DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# 5. Run migrations
npx prisma migrate deploy
```

### Option 2: Supabase

**Free Tier:** 500 MB database, 1 GB bandwidth

```bash
# 1. Sign up at supabase.com
# 2. Create new project
# 3. Go to Settings → Database → Connection string
# 4. Copy URI and add to DATABASE_URL

DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"

# 5. Run migrations
npx prisma migrate deploy
```

### Option 3: Railway

**Built-in PostgreSQL:** Automatically provisioned

```bash
# Railway automatically sets DATABASE_URL
# Just run migrations after deployment
railway run npx prisma migrate deploy
```

---

## 🔧 Environment Variables

### Required Variables

Copy from `.env.example` and fill in:

```bash
# Core
DATABASE_URL=              # PostgreSQL connection string
JWT_SECRET=                # Strong random string (32+ chars)
NEXT_PUBLIC_APP_URL=       # Your production domain

# File Upload
CLOUDINARY_CLOUD_NAME=     # From cloudinary.com dashboard
CLOUDINARY_API_KEY=        # From cloudinary.com dashboard
CLOUDINARY_API_SECRET=     # From cloudinary.com dashboard

# Email
RESEND_API_KEY=            # From resend.com dashboard
FROM_EMAIL=                # Verified sender email

# Background Jobs
REDIS_URL=                 # Redis connection string
```

### Generate Strong Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate webhook secrets
openssl rand -hex 32
```

---

## 📦 Redis Setup

### Option 1: Upstash (Recommended - Serverless)

**Free Tier:** 10,000 commands/day

```bash
# 1. Sign up at upstash.com
# 2. Create new Redis database
# 3. Choose region close to your app
# 4. Copy REDIS_URL

REDIS_URL="rediss://default:xxxxx@region.upstash.io:6379"
```

### Option 2: Redis Cloud

**Free Tier:** 30 MB

```bash
# 1. Sign up at redis.com/try-free
# 2. Create database
# 3. Copy connection string

REDIS_URL="redis://default:password@redis-12345.cloud.redislabs.com:12345"
```

### Option 3: Railway

```bash
# Automatically provisioned with Railway
railway add --service redis
```

---

## ✅ Post-Deployment Checklist

### 1. Verify Database

```bash
# Check migrations
npx prisma migrate status

# Run migrations if needed
npx prisma migrate deploy

# Optional: Seed database
npx prisma db seed
```

### 2. Test Core Features

- [ ] User registration
- [ ] Email verification
- [ ] Login with 2FA
- [ ] Product upload
- [ ] File upload to Cloudinary
- [ ] Order creation
- [ ] Payment webhook
- [ ] Email notifications
- [ ] Invoice generation

### 3. Setup Custom Domain

#### Vercel
1. Go to Settings → Domains
2. Add your domain (e.g., cryptomarket.com)
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

#### Railway
1. Go to Settings → Domains
2. Click "Generate Domain" or add custom
3. Update `NEXT_PUBLIC_APP_URL`

### 4. Configure Webhooks

```bash
# PayGate webhook URL
https://yourdomain.com/api/payments/webhook

# Add to PayGate dashboard:
# - URL: https://yourdomain.com/api/payments/webhook
# - Secret: Your PAYGATE_WEBHOOK_SECRET
```

### 5. Create Admin Account

```bash
# Option 1: Use seed script
npx prisma db seed

# Option 2: Manual registration
# 1. Register at /register
# 2. Update user role in database:
npx prisma studio
# Find user, set role = "ADMIN"
```

---

## 📊 Monitoring & Maintenance

### Setup Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs

# Add to .env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### Setup Analytics (Optional)

```bash
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Database Backups

**Neon:**
- Automatic backups included
- Restore from dashboard

**Supabase:**
- Automatic daily backups (paid plans)
- Manual backups via dashboard

**Railway:**
```bash
# Manual backup
railway run pg_dump > backup.sql

# Restore
railway run psql < backup.sql
```

### Monitor Redis

```bash
# Upstash: Check dashboard for usage
# Railway: railway run redis-cli INFO
```

---

## 🔒 Security Checklist

- [ ] **HTTPS enabled** (automatic with Vercel/Railway)
- [ ] **Strong JWT_SECRET** (32+ characters, random)
- [ ] **Environment variables secured** (not in code)
- [ ] **Admin password changed** from default
- [ ] **CORS configured** properly
- [ ] **Rate limiting** considered (future)
- [ ] **Database backups** enabled
- [ ] **2FA enforced** for admin accounts
- [ ] **Webhook signatures verified**
- [ ] **File upload limits** configured (100MB max)

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Check node version
node --version  # Should be 18+

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues

```bash
# Verify connection string
npx prisma db push --skip-generate

# Check firewall/IP whitelist
# Neon/Supabase: Add 0.0.0.0/0 for Vercel
```

### Email Not Sending

```bash
# Verify Resend API key
# Check sender email is verified
# View logs in Resend dashboard
```

### Redis Connection Fails

```bash
# Verify REDIS_URL format
# Check SSL requirement (rediss:// vs redis://)
# Upstash requires SSL: rediss://
```

### File Upload Fails

```bash
# Verify Cloudinary credentials
# Check file size limits
# View logs in Cloudinary dashboard
```

---

## 🚀 Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_products_seller ON Product(sellerId);
CREATE INDEX idx_orders_buyer ON Order(buyerId);
CREATE INDEX idx_reviews_product ON Review(productId);
```

### Enable Caching

```bash
# Use Redis for session storage
# Cache product listings
# Enable Next.js ISR (Incremental Static Regeneration)
```

### CDN Configuration

- Cloudinary automatically provides CDN
- Vercel includes Edge Network
- Railway supports custom CDN

---

## 📞 Support

### Common Issues

**Q: Migrations fail in production**
```bash
# Reset migrations (dangerous - loses data!)
railway run npx prisma migrate reset

# Safe: Generate new migration
npx prisma migrate dev --name fix_schema
git push  # Redeploy
```

**Q: Background jobs not running**
```bash
# Verify Redis connection
railway run node -e "const redis = require('ioredis'); const client = new redis(process.env.REDIS_URL); client.ping((e,r) => console.log(r)); client.quit();"
```

**Q: Webhooks not receiving events**
```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 📚 Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/deployment/deployment-guides)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Railway Deployment](https://docs.railway.app/deploy/deployments)
- [Cloudinary Upload Guide](https://cloudinary.com/documentation/upload_images)

---

## 🎉 Success!

Your CryptoMarket is now live! 🚀

**Next Steps:**
1. Test all critical features
2. Setup monitoring (Sentry/PostHog)
3. Configure custom domain
4. Enable database backups
5. Share with users!

**Maintenance:**
- Monitor error logs weekly
- Review database size monthly
- Update dependencies quarterly
- Backup database regularly
- Rotate secrets annually
