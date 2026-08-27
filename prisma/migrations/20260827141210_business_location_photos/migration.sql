-- Shop photo gallery: owner-uploaded pictures of the shop (inside/outside/services)
CREATE TABLE "BusinessLocationPhoto" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessLocationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BusinessLocationPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessLocationPhoto_businessLocationId_sortIndex_idx" ON "BusinessLocationPhoto"("businessLocationId", "sortIndex");

ALTER TABLE "BusinessLocationPhoto" ADD CONSTRAINT "BusinessLocationPhoto_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
