-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sellerResponse" TEXT,
    "refundAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processedAt" DATETIME,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_buyerId_idx" ON "Refund"("buyerId");

-- CreateIndex
CREATE INDEX "Refund_sellerId_idx" ON "Refund"("sellerId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");
