-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "stripeId" TEXT
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "maxSpread" REAL NOT NULL,
    "minSize" REAL NOT NULL,
    "rewardPool" REAL NOT NULL,
    "midpoint" REAL NOT NULL,
    "volume" REAL NOT NULL DEFAULT 0,
    "liquidity" REAL NOT NULL DEFAULT 0,
    "endDate" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "midpoint" REAL NOT NULL,
    "totalQMin" REAL NOT NULL,
    "lpCount" INTEGER NOT NULL,
    "rewardPool" REAL NOT NULL,
    CONSTRAINT "MarketSnapshot_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "qOne" REAL NOT NULL,
    "qTwo" REAL NOT NULL,
    "qMin" REAL NOT NULL,
    "estimatedDaily" REAL NOT NULL,
    "userShare" REAL NOT NULL,
    "competitionQMin" REAL NOT NULL,
    "capitalDeployed" REAL NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Position_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "size" REAL NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "spread" REAL NOT NULL,
    "score" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "marketId" TEXT,
    "threshold" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeId_key" ON "User"("stripeId");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_tier_idx" ON "User"("tier");

-- CreateIndex
CREATE INDEX "Market_active_rewardPool_idx" ON "Market"("active", "rewardPool");

-- CreateIndex
CREATE INDEX "Market_endDate_idx" ON "Market"("endDate");

-- CreateIndex
CREATE INDEX "MarketSnapshot_marketId_timestamp_idx" ON "MarketSnapshot"("marketId", "timestamp");

-- CreateIndex
CREATE INDEX "MarketSnapshot_timestamp_idx" ON "MarketSnapshot"("timestamp");

-- CreateIndex
CREATE INDEX "Position_userId_idx" ON "Position"("userId");

-- CreateIndex
CREATE INDEX "Position_marketId_idx" ON "Position"("marketId");

-- CreateIndex
CREATE INDEX "Position_calculatedAt_idx" ON "Position"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Position_userId_marketId_key" ON "Position"("userId", "marketId");

-- CreateIndex
CREATE INDEX "Order_userId_marketId_active_idx" ON "Order"("userId", "marketId", "active");

-- CreateIndex
CREATE INDEX "Order_marketId_active_idx" ON "Order"("marketId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_txHash_key" ON "Payout"("txHash");

-- CreateIndex
CREATE INDEX "Payout_userId_date_idx" ON "Payout"("userId", "date");

-- CreateIndex
CREATE INDEX "Payout_date_idx" ON "Payout"("date");

-- CreateIndex
CREATE INDEX "Payout_txHash_idx" ON "Payout"("txHash");

-- CreateIndex
CREATE INDEX "Alert_userId_active_idx" ON "Alert"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCache_key_key" ON "ApiCache"("key");

-- CreateIndex
CREATE INDEX "ApiCache_key_idx" ON "ApiCache"("key");

-- CreateIndex
CREATE INDEX "ApiCache_expiresAt_idx" ON "ApiCache"("expiresAt");
