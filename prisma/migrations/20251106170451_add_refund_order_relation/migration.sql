-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Refund" (
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
    "sellerId" TEXT NOT NULL,
    CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Refund" ("buyerId", "createdAt", "id", "orderId", "processedAt", "reason", "refundAmount", "sellerId", "sellerResponse", "status", "updatedAt") SELECT "buyerId", "createdAt", "id", "orderId", "processedAt", "reason", "refundAmount", "sellerId", "sellerResponse", "status", "updatedAt" FROM "Refund";
DROP TABLE "Refund";
ALTER TABLE "new_Refund" RENAME TO "Refund";
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX "Refund_buyerId_idx" ON "Refund"("buyerId");
CREATE INDEX "Refund_sellerId_idx" ON "Refund"("sellerId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
