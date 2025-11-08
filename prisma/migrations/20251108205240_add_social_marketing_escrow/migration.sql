-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "productIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PROMOTIONAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "targetRole" TEXT,
    "targetTier" TEXT,
    "recipientIds" TEXT,
    "scheduledFor" DATETIME,
    "sentAt" DATETIME,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,
    "clicked" INTEGER NOT NULL DEFAULT 0,
    "bounced" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "discountPercentage" REAL,
    "discountAmount" REAL,
    "minimumPurchase" REAL,
    "productIds" TEXT,
    "categoryIds" TEXT,
    "sellerIds" TEXT,
    "maxUsesPerUser" INTEGER,
    "maxTotalUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PromotionUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "discount" REAL NOT NULL,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" DATETIME
);

-- CreateTable
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "platformFee" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "escrowAddress" TEXT,
    "txHash" TEXT,
    "releaseHash" TEXT,
    "fundedAt" DATETIME,
    "deliveredAt" DATETIME,
    "releasedAt" DATETIME,
    "expiresAt" DATETIME,
    "disputeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Follow_createdAt_idx" ON "Follow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "ProductLike_userId_idx" ON "ProductLike"("userId");

-- CreateIndex
CREATE INDEX "ProductLike_productId_idx" ON "ProductLike"("productId");

-- CreateIndex
CREATE INDEX "ProductLike_createdAt_idx" ON "ProductLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLike_userId_productId_key" ON "ProductLike"("userId", "productId");

-- CreateIndex
CREATE INDEX "ProductShare_userId_idx" ON "ProductShare"("userId");

-- CreateIndex
CREATE INDEX "ProductShare_productId_idx" ON "ProductShare"("productId");

-- CreateIndex
CREATE INDEX "ProductShare_platform_idx" ON "ProductShare"("platform");

-- CreateIndex
CREATE INDEX "ProductShare_createdAt_idx" ON "ProductShare"("createdAt");

-- CreateIndex
CREATE INDEX "Wishlist_userId_idx" ON "Wishlist"("userId");

-- CreateIndex
CREATE INDEX "Wishlist_productId_idx" ON "Wishlist"("productId");

-- CreateIndex
CREATE INDEX "Wishlist_createdAt_idx" ON "Wishlist"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "Collection_isPublic_idx" ON "Collection"("isPublic");

-- CreateIndex
CREATE INDEX "Collection_createdAt_idx" ON "Collection"("createdAt");

-- CreateIndex
CREATE INDEX "EmailCampaign_status_idx" ON "EmailCampaign"("status");

-- CreateIndex
CREATE INDEX "EmailCampaign_type_idx" ON "EmailCampaign"("type");

-- CreateIndex
CREATE INDEX "EmailCampaign_scheduledFor_idx" ON "EmailCampaign"("scheduledFor");

-- CreateIndex
CREATE INDEX "EmailCampaign_createdBy_idx" ON "EmailCampaign"("createdBy");

-- CreateIndex
CREATE INDEX "EmailCampaign_createdAt_idx" ON "EmailCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- CreateIndex
CREATE INDEX "Promotion_startDate_idx" ON "Promotion"("startDate");

-- CreateIndex
CREATE INDEX "Promotion_endDate_idx" ON "Promotion"("endDate");

-- CreateIndex
CREATE INDEX "Promotion_createdBy_idx" ON "Promotion"("createdBy");

-- CreateIndex
CREATE INDEX "Promotion_type_idx" ON "Promotion"("type");

-- CreateIndex
CREATE INDEX "PromotionUsage_promotionId_idx" ON "PromotionUsage"("promotionId");

-- CreateIndex
CREATE INDEX "PromotionUsage_userId_idx" ON "PromotionUsage"("userId");

-- CreateIndex
CREATE INDEX "PromotionUsage_orderId_idx" ON "PromotionUsage"("orderId");

-- CreateIndex
CREATE INDEX "PromotionUsage_usedAt_idx" ON "PromotionUsage"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_email_idx" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_userId_idx" ON "NewsletterSubscription"("userId");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_isActive_idx" ON "NewsletterSubscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_orderId_key" ON "EscrowTransaction"("orderId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_orderId_idx" ON "EscrowTransaction"("orderId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_buyerId_idx" ON "EscrowTransaction"("buyerId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_sellerId_idx" ON "EscrowTransaction"("sellerId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_status_idx" ON "EscrowTransaction"("status");

-- CreateIndex
CREATE INDEX "EscrowTransaction_createdAt_idx" ON "EscrowTransaction"("createdAt");
