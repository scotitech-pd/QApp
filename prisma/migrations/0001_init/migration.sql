-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IndustryType" AS ENUM ('BARBER', 'SALON', 'BEAUTY_CLINIC', 'NAIL_STUDIO', 'TATTOO_STUDIO', 'CAR_WASH', 'VEHICLE_SERVICE_CENTRE', 'PHYSIOTHERAPY_CLINIC', 'DENTAL_CLINIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF_OPERATOR', 'ADMIN_SUPPORT');

-- CreateEnum
CREATE TYPE "VisitSource" AS ENUM ('REMOTE_QUEUE', 'IN_STORE_QUEUE', 'WALK_IN', 'BOOKING');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('QUEUED', 'CONFIRMATION_PENDING', 'CALLED', 'READY', 'IN_SERVICE', 'COMPLETED', 'MISSED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ArrivalResponseStatus" AS ENUM ('PENDING', 'COMING', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('HOLD', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'WAIVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'WEB_PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('QUEUE_JOINED', 'POSITION_CHANGED', 'ETA_CHANGED', 'NEAR_TURN', 'ARRIVAL_CONFIRMATION', 'CALLED_NOW', 'MISSED_TURN', 'BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'DELAY_UPDATE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ', 'RESPONDED');

-- CreateEnum
CREATE TYPE "ServiceAdjustmentType" AS ENUM ('PREDEFINED', 'FREE_TEXT', 'WALK_IN_DURATION', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "OperationalEventType" AS ENUM ('BUSINESS_APPROVED', 'QUEUE_JOINED', 'QUEUE_LEFT', 'QUEUE_REORDERED', 'WALK_IN_ADDED', 'ARRIVAL_CONFIRMATION_SENT', 'ARRIVAL_CONFIRMED', 'ARRIVAL_DECLINED', 'ARRIVAL_EXPIRED', 'CUSTOMER_CALLED', 'SERVICE_STARTED', 'SERVICE_EXTENDED', 'SERVICE_COMPLETED', 'BOOKING_CREATED', 'BOOKING_CANCELLED', 'SLOT_RELEASED', 'QUEUE_PAUSED', 'QUEUE_RESUMED');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('CUSTOMER_QUEUE_JOIN', 'BUSINESS_SIGNUP', 'STAFF_INVITE', 'LOGIN');

-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GeolocationSource" AS ENUM ('BROWSER_GPS', 'ADDRESS_GEOCODE', 'MANUAL_PIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industryType" "IndustryType" NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "BusinessGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLocation" (
    "id" TEXT NOT NULL,
    "businessGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "LocationStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicDescription" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'GB',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "placeId" TEXT,
    "geolocationSource" "GeolocationSource",
    "geolocationCapturedAt" TIMESTAMP(3),
    "pinConfirmedAt" TIMESTAMP(3),
    "pinAdjustedAt" TIMESTAMP(3),
    "openingHours" JSONB,
    "queueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bookingsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "queuePaused" BOOLEAN NOT NULL DEFAULT false,
    "queuePauseReason" TEXT,
    "serviceStationsCount" INTEGER NOT NULL DEFAULT 1,
    "defaultWalkInDurationMin" INTEGER NOT NULL DEFAULT 20,
    "nearTurnPositionTrigger" INTEGER NOT NULL DEFAULT 2,
    "nearTurnEtaTriggerMin" INTEGER NOT NULL DEFAULT 15,
    "calledGracePeriodMin" INTEGER NOT NULL DEFAULT 5,
    "onboardingCompletedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSignup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'GB',
    "industryType" "IndustryType" NOT NULL,
    "serviceStationsCount" INTEGER NOT NULL,
    "openingHoursNote" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "placeId" TEXT,
    "geolocationSource" "GeolocationSource",
    "geolocationCapturedAt" TIMESTAMP(3),
    "pinConfirmedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "approvedBusinessGroupId" TEXT,
    "approvedLocationId" TEXT,

    CONSTRAINT "BusinessSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMembership" (
    "id" TEXT NOT NULL,
    "businessGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "skillTags" TEXT[],

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "marketingOptInAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "defaultDurationMin" INTEGER NOT NULL,
    "priceMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "isQueueable" BOOLEAN NOT NULL DEFAULT true,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "assignedStaffMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" "VisitSource" NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'QUEUED',
    "plannedDurationMin" INTEGER,
    "estimatedWaitMin" INTEGER,
    "actualDurationMin" INTEGER,
    "queueJoinedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "insertedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "manualInsertReason" TEXT,
    "confirmationStatus" "ArrivalResponseStatus" NOT NULL DEFAULT 'PENDING',
    "confirmationRequestedAt" TIMESTAMP(3),
    "confirmationRespondedAt" TIMESTAMP(3),
    "calledAt" TIMESTAMP(3),
    "presentConfirmedAt" TIMESTAMP(3),
    "missedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slotStartAt" TIMESTAMP(3) NOT NULL,
    "slotEndAt" TIMESTAMP(3) NOT NULL,
    "bookingFeeMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "visitId" TEXT,
    "reservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "providerPaymentIntentId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAdjustment" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ServiceAdjustmentType" NOT NULL,
    "label" TEXT NOT NULL,
    "durationDeltaMin" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ServiceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "visitId" TEXT,
    "customerId" TEXT,
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "target" TEXT NOT NULL,
    "templateKey" TEXT,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "responseText" TEXT,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalEvent" (
    "id" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "visitId" TEXT,
    "queueEntryId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "OperationalEventType" NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationChallenge" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "userId" TEXT,
    "businessLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "target" TEXT NOT NULL,
    "codeHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessGroup_slug_key" ON "BusinessGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLocation_slug_key" ON "BusinessLocation"("slug");

-- CreateIndex
CREATE INDEX "BusinessLocation_businessGroupId_idx" ON "BusinessLocation"("businessGroupId");

-- CreateIndex
CREATE INDEX "BusinessLocation_status_isPublic_idx" ON "BusinessLocation"("status", "isPublic");

-- CreateIndex
CREATE INDEX "BusinessSignup_approvalStatus_createdAt_idx" ON "BusinessSignup"("approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessSignup_approvedBusinessGroupId_idx" ON "BusinessSignup"("approvedBusinessGroupId");

-- CreateIndex
CREATE INDEX "BusinessSignup_approvedLocationId_idx" ON "BusinessSignup"("approvedLocationId");

-- CreateIndex
CREATE INDEX "BusinessMembership_userId_idx" ON "BusinessMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMembership_businessGroupId_userId_key" ON "BusinessMembership"("businessGroupId", "userId");

-- CreateIndex
CREATE INDEX "StaffMember_businessLocationId_isActive_idx" ON "StaffMember"("businessLocationId", "isActive");

-- CreateIndex
CREATE INDEX "StaffMember_userId_idx" ON "StaffMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Service_businessLocationId_isActive_idx" ON "Service"("businessLocationId", "isActive");

-- CreateIndex
CREATE INDEX "Visit_businessLocationId_status_idx" ON "Visit"("businessLocationId", "status");

-- CreateIndex
CREATE INDEX "Visit_customerId_createdAt_idx" ON "Visit"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Visit_assignedStaffMemberId_idx" ON "Visit"("assignedStaffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_visitId_key" ON "QueueEntry"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_trackingToken_key" ON "QueueEntry"("trackingToken");

-- CreateIndex
CREATE INDEX "QueueEntry_businessLocationId_sortIndex_idx" ON "QueueEntry"("businessLocationId", "sortIndex");

-- CreateIndex
CREATE INDEX "QueueEntry_businessLocationId_confirmationStatus_idx" ON "QueueEntry"("businessLocationId", "confirmationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_visitId_key" ON "Reservation"("visitId");

-- CreateIndex
CREATE INDEX "Reservation_businessLocationId_slotStartAt_idx" ON "Reservation"("businessLocationId", "slotStartAt");

-- CreateIndex
CREATE INDEX "Reservation_status_slotStartAt_idx" ON "Reservation"("status", "slotStartAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_visitId_key" ON "Payment"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reservationId_key" ON "Payment"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentIntentId_key" ON "Payment"("providerPaymentIntentId");

-- CreateIndex
CREATE INDEX "ServiceAdjustment_visitId_createdAt_idx" ON "ServiceAdjustment"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_businessLocationId_type_createdAt_idx" ON "NotificationEvent"("businessLocationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_visitId_createdAt_idx" ON "NotificationEvent"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_businessLocationId_createdAt_idx" ON "OperationalEvent"("businessLocationId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_visitId_createdAt_idx" ON "OperationalEvent"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_queueEntryId_createdAt_idx" ON "OperationalEvent"("queueEntryId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationChallenge_target_purpose_status_idx" ON "VerificationChallenge"("target", "purpose", "status");

-- CreateIndex
CREATE INDEX "VerificationChallenge_customerId_createdAt_idx" ON "VerificationChallenge"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationChallenge_userId_createdAt_idx" ON "VerificationChallenge"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_businessGroupId_fkey" FOREIGN KEY ("businessGroupId") REFERENCES "BusinessGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSignup" ADD CONSTRAINT "BusinessSignup_approvedBusinessGroupId_fkey" FOREIGN KEY ("approvedBusinessGroupId") REFERENCES "BusinessGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSignup" ADD CONSTRAINT "BusinessSignup_approvedLocationId_fkey" FOREIGN KEY ("approvedLocationId") REFERENCES "BusinessLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_businessGroupId_fkey" FOREIGN KEY ("businessGroupId") REFERENCES "BusinessGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_assignedStaffMemberId_fkey" FOREIGN KEY ("assignedStaffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_insertedByUserId_fkey" FOREIGN KEY ("insertedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAdjustment" ADD CONSTRAINT "ServiceAdjustment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAdjustment" ADD CONSTRAINT "ServiceAdjustment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationChallenge" ADD CONSTRAINT "VerificationChallenge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationChallenge" ADD CONSTRAINT "VerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationChallenge" ADD CONSTRAINT "VerificationChallenge_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "BusinessLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
