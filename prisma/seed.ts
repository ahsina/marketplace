import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create categories
  console.log('Creating categories...')
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'software' },
      update: {},
      create: {
        name: 'Software & Tools',
        slug: 'software',
        description: 'Software applications, plugins, and development tools',
        icon: '💻',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'digital-art' },
      update: {},
      create: {
        name: 'Digital Art',
        slug: 'digital-art',
        description: 'Graphics, illustrations, and digital artwork',
        icon: '🎨',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'templates' },
      update: {},
      create: {
        name: 'Templates',
        slug: 'templates',
        description: 'Website templates, design templates, and themes',
        icon: '📄',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'education' },
      update: {},
      create: {
        name: 'Education',
        slug: 'education',
        description: 'Online courses, ebooks, and learning materials',
        icon: '📚',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'music' },
      update: {},
      create: {
        name: 'Music & Audio',
        slug: 'music',
        description: 'Music tracks, sound effects, and audio samples',
        icon: '🎵',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'video' },
      update: {},
      create: {
        name: 'Video & Animation',
        slug: 'video',
        description: 'Video templates, motion graphics, and animations',
        icon: '🎬',
      },
    }),
  ])
  console.log(`✅ Created ${categories.length} categories`)

  // Create users
  console.log('Creating users...')
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cryptomarket.com' },
    update: {},
    create: {
      email: 'admin@cryptomarket.com',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
      subscriptionTier: 'ENTERPRISE',
      emailVerified: true,
    },
  })

  const seller1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      username: 'john_doe',
      password: hashedPassword,
      role: 'SELLER',
      subscriptionTier: 'PREMIUM',
      emailVerified: true,
    },
  })

  const seller2 = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      username: 'sarah_designs',
      password: hashedPassword,
      role: 'SELLER',
      subscriptionTier: 'BASIC',
      emailVerified: true,
    },
  })

  const buyer1 = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: {
      email: 'buyer@example.com',
      username: 'crypto_buyer',
      password: hashedPassword,
      role: 'BUYER',
      subscriptionTier: 'FREE',
      emailVerified: true,
    },
  })

  console.log('✅ Created 4 users')

  // Create products
  console.log('Creating products...')
  const products = [
    {
      title: 'Premium WordPress Theme - Business Pro',
      description: 'A fully responsive and customizable WordPress theme perfect for businesses, portfolios, and corporate websites. Includes 10+ homepage layouts, WooCommerce integration, and lifetime updates.',
      shortDescription: 'Professional WordPress theme for business websites',
      price: 59.99,
      discountPrice: 39.99,
      fileUrl: 'https://example.com/files/wordpress-theme.zip',
      fileName: 'business-pro-theme.zip',
      fileSize: 15728640, // 15MB
      thumbnailUrl: 'https://via.placeholder.com/400x300/667eea/ffffff?text=WordPress+Theme',
      categoryId: categories[2].id, // Templates
      sellerId: seller1.id,
    },
    {
      title: 'React Admin Dashboard Template',
      description: 'Modern and clean admin dashboard template built with React, TypeScript, and Tailwind CSS. Features 50+ components, dark mode, responsive design, and complete documentation.',
      shortDescription: 'Modern React admin template with TypeScript',
      price: 49.99,
      fileUrl: 'https://example.com/files/react-dashboard.zip',
      fileName: 'react-admin-dashboard.zip',
      fileSize: 20971520, // 20MB
      thumbnailUrl: 'https://via.placeholder.com/400x300/4facfe/ffffff?text=React+Dashboard',
      categoryId: categories[2].id, // Templates
      sellerId: seller1.id,
    },
    {
      title: 'Logo Design Mega Pack - 100+ Templates',
      description: 'Professional logo design pack with over 100 fully customizable logo templates. Includes AI, PSD, and SVG files. Perfect for startups, agencies, and designers.',
      shortDescription: '100+ professional logo templates',
      price: 29.99,
      discountPrice: 19.99,
      fileUrl: 'https://example.com/files/logo-pack.zip',
      fileName: 'logo-design-pack.zip',
      fileSize: 52428800, // 50MB
      thumbnailUrl: 'https://via.placeholder.com/400x300/f093fb/ffffff?text=Logo+Pack',
      categoryId: categories[1].id, // Digital Art
      sellerId: seller2.id,
    },
    {
      title: 'Complete Web Development Bootcamp 2024',
      description: 'Master modern web development with this comprehensive course. Learn HTML, CSS, JavaScript, React, Node.js, MongoDB, and more. Includes 40+ hours of video content, projects, and lifetime access.',
      shortDescription: 'Complete web development course from beginner to advanced',
      price: 89.99,
      discountPrice: 49.99,
      fileUrl: 'https://example.com/files/web-dev-course.zip',
      fileName: 'web-development-bootcamp.zip',
      fileSize: 1073741824, // 1GB
      categoryId: categories[3].id, // Education
      sellerId: seller1.id,
    },
    {
      title: 'Figma UI Kit - Mobile App Design System',
      description: 'Complete mobile app design system for Figma. Includes 200+ screens, components, icons, and styles. Perfect for iOS and Android app design.',
      shortDescription: 'Professional Figma UI kit for mobile apps',
      price: 39.99,
      fileUrl: 'https://example.com/files/figma-ui-kit.fig',
      fileName: 'mobile-ui-kit.fig',
      fileSize: 5242880, // 5MB
      thumbnailUrl: 'https://via.placeholder.com/400x300/4facfe/ffffff?text=Figma+UI+Kit',
      categoryId: categories[1].id, // Digital Art
      sellerId: seller2.id,
    },
    {
      title: 'Royalty-Free Music Pack - 50 Tracks',
      description: 'High-quality royalty-free music collection perfect for YouTube videos, podcasts, and commercial projects. Includes various genres and moods.',
      shortDescription: '50 royalty-free music tracks for commercial use',
      price: 79.99,
      discountPrice: 59.99,
      fileUrl: 'https://example.com/files/music-pack.zip',
      fileName: 'royalty-free-music.zip',
      fileSize: 524288000, // 500MB
      categoryId: categories[4].id, // Music
      sellerId: seller2.id,
    },
    {
      title: 'Python Automation Scripts Collection',
      description: 'Collection of 30+ useful Python automation scripts for everyday tasks. Includes web scraping, file management, email automation, and more.',
      shortDescription: '30+ Python scripts for automation',
      price: 24.99,
      fileUrl: 'https://example.com/files/python-scripts.zip',
      fileName: 'python-automation-scripts.zip',
      fileSize: 1048576, // 1MB
      categoryId: categories[0].id, // Software
      sellerId: seller1.id,
    },
    {
      title: 'After Effects Logo Animation Pack',
      description: '25 professional logo animation templates for After Effects. Easy to customize, HD quality, with video tutorials included.',
      shortDescription: '25 logo animation templates for After Effects',
      price: 34.99,
      fileUrl: 'https://example.com/files/ae-animations.zip',
      fileName: 'logo-animations-ae.zip',
      fileSize: 209715200, // 200MB
      thumbnailUrl: 'https://via.placeholder.com/400x300/00f2fe/ffffff?text=AE+Animations',
      categoryId: categories[5].id, // Video
      sellerId: seller2.id,
    },
  ]

  const createdProducts = []
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        ...product,
        viewCount: Math.floor(Math.random() * 1000) + 100,
        downloadCount: Math.floor(Math.random() * 100) + 10,
      },
    })
    createdProducts.push(created)
  }

  console.log(`✅ Created ${createdProducts.length} products`)

  // Create some sample reviews
  console.log('Creating reviews...')
  const reviews = [
    {
      productId: createdProducts[0].id,
      userId: buyer1.id,
      rating: 5,
      comment: 'Excellent theme! Easy to customize and great documentation.',
      isVerified: true,
    },
    {
      productId: createdProducts[0].id,
      userId: seller2.id,
      rating: 4,
      comment: 'Very good quality, worth the price.',
      isVerified: true,
    },
    {
      productId: createdProducts[2].id,
      userId: buyer1.id,
      rating: 5,
      comment: 'Amazing collection of logos. Saved me so much time!',
      isVerified: true,
    },
    {
      productId: createdProducts[3].id,
      userId: seller2.id,
      rating: 5,
      comment: 'Best web development course I\'ve taken. Highly recommended!',
      isVerified: true,
    },
  ]

  for (const review of reviews) {
    await prisma.review.create({ data: review })
  }

  console.log(`✅ Created ${reviews.length} reviews`)

  console.log('✅ Database seeded successfully!')
  console.log('\n📝 Test Accounts:')
  console.log('Admin: admin@cryptomarket.com / password123')
  console.log('Seller 1: john@example.com / password123')
  console.log('Seller 2: sarah@example.com / password123')
  console.log('Buyer: buyer@example.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
