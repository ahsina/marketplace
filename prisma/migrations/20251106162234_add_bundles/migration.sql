-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "discountPercent" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productIds" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Bundle_sellerId_idx" ON "Bundle"("sellerId");

-- CreateIndex
CREATE INDEX "Bundle_isActive_idx" ON "Bundle"("isActive");
