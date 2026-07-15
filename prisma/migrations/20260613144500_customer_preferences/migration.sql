-- CreateTable
CREATE TABLE "CustomerPreferenceProfile" (
    "id" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,

    CONSTRAINT "CustomerPreferenceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteBusinessLocation" (
    "id" TEXT NOT NULL,
    "preferenceProfileId" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteBusinessLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPreferenceProfile_deviceKey_key" ON "CustomerPreferenceProfile"("deviceKey");

-- CreateIndex
CREATE INDEX "CustomerPreferenceProfile_customerId_idx" ON "CustomerPreferenceProfile"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPreferenceProfile_lastSeenAt_idx" ON "CustomerPreferenceProfile"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteBusinessLocation_preferenceProfileId_businessLocationId_key" ON "FavoriteBusinessLocation"("preferenceProfileId", "businessLocationId");

-- CreateIndex
CREATE INDEX "FavoriteBusinessLocation_businessLocationId_createdAt_idx" ON "FavoriteBusinessLocation"("businessLocationId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerPreferenceProfile" ADD CONSTRAINT "CustomerPreferenceProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteBusinessLocation" ADD CONSTRAINT "FavoriteBusinessLocation_preferenceProfileId_fkey" FOREIGN KEY ("preferenceProfileId") REFERENCES "CustomerPreferenceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteBusinessLocation" ADD CONSTRAINT "FavoriteBusinessLocation_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
