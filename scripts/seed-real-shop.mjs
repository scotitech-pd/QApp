#!/usr/bin/env node

// Seed one real pilot shop into the database. Idempotent: safe to re-run.
// Usage: node scripts/seed-real-shop.mjs --file ./pilot-shop.json

import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  ApprovalStatus,
  AppRole,
  GeolocationSource,
  IndustryType,
  LocationStatus,
  MembershipRole,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function readShopFile() {
  const flagIndex = process.argv.indexOf("--file");
  if (flagIndex === -1 || !process.argv[flagIndex + 1]) {
    throw new Error("Missing --file <path>.");
  }
  const filePath = path.resolve(process.cwd(), process.argv[flagIndex + 1]);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function assertShape(shop) {
  const required = [
    "slug",
    "name",
    "ownerEmail",
    "ownerPassword",
    "ownerFirstName",
    "ownerLastName",
    "ownerPhone",
    "addressLine1",
    "city",
    "postalCode",
    "countryCode",
    "latitude",
    "longitude",
    "timezone",
    "serviceStationsCount",
    "defaultServiceDurationMin",
    "openingHours"
  ];
  const missing = required.filter((field) => shop[field] === undefined || shop[field] === null);
  if (missing.length > 0) {
    throw new Error(`Pilot shop JSON is missing required fields: ${missing.join(", ")}`);
  }
  if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) {
    throw new Error("latitude and longitude must be numbers.");
  }
  if (!/^[a-z0-9-]+$/.test(shop.slug)) {
    throw new Error("slug must be lowercase kebab-case (a-z, 0-9, dashes).");
  }
}

async function upsertOwnerUser(shop) {
  const passwordHash = await hashPassword(shop.ownerPassword);
  return prisma.user.upsert({
    where: { email: shop.ownerEmail },
    update: {
      appRole: AppRole.USER,
      firstName: shop.ownerFirstName,
      lastName: shop.ownerLastName,
      phone: shop.ownerPhone,
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    },
    create: {
      appRole: AppRole.USER,
      firstName: shop.ownerFirstName,
      lastName: shop.ownerLastName,
      email: shop.ownerEmail,
      phone: shop.ownerPhone,
      passwordHash
    }
  });
}

async function main() {
  const shop = readShopFile();
  assertShape(shop);

  const industryType = IndustryType[shop.industryType ?? "BARBER"];
  if (!industryType) {
    throw new Error(`Unknown industryType: ${shop.industryType}`);
  }

  const businessGroup = await prisma.businessGroup.upsert({
    where: { slug: shop.slug },
    update: {
      name: shop.groupName ?? shop.name,
      industryType,
      approvalStatus: ApprovalStatus.APPROVED,
      notes: "Q-App pilot shop"
    },
    create: {
      slug: shop.slug,
      name: shop.groupName ?? shop.name,
      industryType,
      approvalStatus: ApprovalStatus.APPROVED,
      notes: "Q-App pilot shop"
    }
  });

  const businessLocation = await prisma.businessLocation.upsert({
    where: { slug: shop.slug },
    update: {
      businessGroupId: businessGroup.id,
      name: shop.name,
      status: LocationStatus.LIVE,
      isPublic: true,
      publicDescription: shop.publicDescription ?? `${shop.name} on Q-App.`,
      phone: shop.publicPhone ?? shop.ownerPhone,
      email: shop.publicEmail ?? shop.ownerEmail,
      timezone: shop.timezone,
      addressLine1: shop.addressLine1,
      addressLine2: shop.addressLine2 ?? null,
      city: shop.city,
      postalCode: shop.postalCode,
      countryCode: shop.countryCode,
      latitude: shop.latitude,
      longitude: shop.longitude,
      geolocationSource: GeolocationSource.MANUAL_PIN,
      geolocationCapturedAt: new Date(),
      pinConfirmedAt: new Date(),
      queueEnabled: true,
      bookingsEnabled: false,
      queuePaused: false,
      serviceStationsCount: shop.serviceStationsCount,
      defaultWalkInDurationMin: shop.defaultServiceDurationMin,
      nearTurnPositionTrigger: shop.nearTurnPositionTrigger ?? 2,
      nearTurnEtaTriggerMin: shop.nearTurnEtaTriggerMin ?? 15,
      calledGracePeriodMin: shop.calledGracePeriodMin ?? 5,
      onboardingCompletedAt: new Date(),
      approvedAt: new Date(),
      openingHours: shop.openingHours
    },
    create: {
      businessGroupId: businessGroup.id,
      slug: shop.slug,
      name: shop.name,
      status: LocationStatus.LIVE,
      isPublic: true,
      publicDescription: shop.publicDescription ?? `${shop.name} on Q-App.`,
      phone: shop.publicPhone ?? shop.ownerPhone,
      email: shop.publicEmail ?? shop.ownerEmail,
      timezone: shop.timezone,
      addressLine1: shop.addressLine1,
      addressLine2: shop.addressLine2 ?? null,
      city: shop.city,
      postalCode: shop.postalCode,
      countryCode: shop.countryCode,
      latitude: shop.latitude,
      longitude: shop.longitude,
      geolocationSource: GeolocationSource.MANUAL_PIN,
      geolocationCapturedAt: new Date(),
      pinConfirmedAt: new Date(),
      queueEnabled: true,
      bookingsEnabled: false,
      queuePaused: false,
      serviceStationsCount: shop.serviceStationsCount,
      defaultWalkInDurationMin: shop.defaultServiceDurationMin,
      nearTurnPositionTrigger: shop.nearTurnPositionTrigger ?? 2,
      nearTurnEtaTriggerMin: shop.nearTurnEtaTriggerMin ?? 15,
      calledGracePeriodMin: shop.calledGracePeriodMin ?? 5,
      onboardingCompletedAt: new Date(),
      approvedAt: new Date(),
      openingHours: shop.openingHours
    }
  });

  const owner = await upsertOwnerUser(shop);

  await prisma.businessMembership.upsert({
    where: {
      businessGroupId_userId: {
        businessGroupId: businessGroup.id,
        userId: owner.id
      }
    },
    update: {
      role: MembershipRole.OWNER,
      acceptedAt: new Date()
    },
    create: {
      businessGroupId: businessGroup.id,
      userId: owner.id,
      role: MembershipRole.OWNER,
      acceptedAt: new Date()
    }
  });

  const existingStaff = await prisma.staffMember.findFirst({
    where: { businessLocationId: businessLocation.id, userId: owner.id }
  });
  if (existingStaff) {
    await prisma.staffMember.update({
      where: { id: existingStaff.id },
      data: {
        displayName: `${shop.ownerFirstName} ${shop.ownerLastName}`,
        sortOrder: 1,
        skillTags: ["queue"]
      }
    });
  } else {
    await prisma.staffMember.create({
      data: {
        businessLocationId: businessLocation.id,
        userId: owner.id,
        displayName: `${shop.ownerFirstName} ${shop.ownerLastName}`,
        sortOrder: 1,
        skillTags: ["queue"]
      }
    });
  }

  const serviceName = shop.serviceName ?? "Classic Cut";
  const existingService = await prisma.service.findFirst({
    where: { businessLocationId: businessLocation.id, name: serviceName }
  });
  if (existingService) {
    await prisma.service.update({
      where: { id: existingService.id },
      data: {
        defaultDurationMin: shop.defaultServiceDurationMin,
        isQueueable: true,
        isBookable: false,
        isActive: true
      }
    });
  } else {
    await prisma.service.create({
      data: {
        businessLocationId: businessLocation.id,
        name: serviceName,
        category: shop.serviceCategory ?? "Haircut",
        description: shop.serviceDescription ?? "Standard service for the queue",
        defaultDurationMin: shop.defaultServiceDurationMin,
        isQueueable: true,
        isBookable: false,
        isActive: true
      }
    });
  }

  console.log("Pilot shop seeded.");
  console.log(`  Shop slug:            ${businessLocation.slug}`);
  console.log(`  Customer URL:         /shops/${businessLocation.slug}`);
  console.log(`  Ops dashboard URL:    /ops/shops/${businessLocation.slug}`);
  console.log(`  Owner login email:    ${shop.ownerEmail}`);
  console.log(`  Owner login password: ${shop.ownerPassword}`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
