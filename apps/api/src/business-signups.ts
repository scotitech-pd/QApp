import {
  AppRole,
  ApprovalStatus,
  GeolocationSource,
  IndustryType,
  LocationStatus,
  MembershipRole,
  type BusinessSignup
} from "@prisma/client";

import { ApiError } from "./core/api-error";
import { hashPassword, validatePasswordStrength } from "./core/password";
import { prisma } from "./prisma";

export type BusinessSignupInput = {
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  countryCode: string;
  industryType: string;
  serviceStationsCount: number;
  openingHoursNote: string;
  password: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  geolocationSource: string;
  pinConfirmedAt: string;
};

type NormalizedBusinessSignupInput = {
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  countryCode: string;
  industryType: IndustryType;
  serviceStationsCount: number;
  openingHoursNote: string;
  password: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  geolocationSource: GeolocationSource;
  pinConfirmedAt: Date;
};

const industryTypes = new Set(Object.values(IndustryType));
const geolocationSources = new Set(Object.values(GeolocationSource));

function requireNonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function requireFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeString(value: string) {
  return value.trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function createUniqueSlug(base: string, type: "group" | "location") {
  const normalizedBase = slugify(base) || `${type}-${Date.now()}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;

    const existing =
      type === "group"
        ? await prisma.businessGroup.findUnique({ where: { slug }, select: { id: true } })
        : await prisma.businessLocation.findUnique({ where: { slug }, select: { id: true } });

    if (!existing) {
      return slug;
    }
  }

  return `${normalizedBase}-${Date.now()}`;
}

export function validateBusinessSignupInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;

  const requiredTextFields = [
    "businessName",
    "ownerName",
    "mobileNumber",
    "email",
    "industryType",
    "openingHoursNote",
    "pinConfirmedAt",
    "geolocationSource"
  ];

  for (const field of requiredTextFields) {
    if (!requireNonEmpty(input[field])) {
      return { ok: false as const, error: `Missing required field: ${field}` };
    }
  }

  if (!requireFiniteNumber(input.latitude) || !requireFiniteNumber(input.longitude)) {
    return { ok: false as const, error: "Latitude and longitude are required." };
  }

  if (!requireFiniteNumber(input.serviceStationsCount) || Number(input.serviceStationsCount) < 1) {
    return { ok: false as const, error: "Service stations count must be at least 1." };
  }

  if (typeof input.password !== "string" || input.password.length === 0) {
    return { ok: false as const, error: "Password is required so the owner can sign in after approval." };
  }

  const passwordCheck = validatePasswordStrength(input.password);
  if (!passwordCheck.ok) {
    return { ok: false as const, error: passwordCheck.errors[0] ?? "Password does not meet policy requirements." };
  }

  const industryType = normalizeString(String(input.industryType)) as IndustryType;
  const geolocationSource = normalizeString(String(input.geolocationSource)) as GeolocationSource;

  if (!industryTypes.has(industryType)) {
    return { ok: false as const, error: "Invalid industry type." };
  }

  if (!geolocationSources.has(geolocationSource)) {
    return { ok: false as const, error: "Invalid geolocation source." };
  }

  const pinConfirmedAt = new Date(String(input.pinConfirmedAt));

  if (Number.isNaN(pinConfirmedAt.valueOf())) {
    return { ok: false as const, error: "Invalid pin confirmation timestamp." };
  }

  const normalized: NormalizedBusinessSignupInput = {
    businessName: normalizeString(String(input.businessName)),
    ownerName: normalizeString(String(input.ownerName)),
    mobileNumber: normalizeString(String(input.mobileNumber)),
    email: normalizeString(String(input.email)).toLowerCase(),
    addressLine1: requireNonEmpty(input.addressLine1) ? normalizeString(String(input.addressLine1)) : "",
    addressLine2: requireNonEmpty(input.addressLine2) ? normalizeString(String(input.addressLine2)) : undefined,
    city: requireNonEmpty(input.city) ? normalizeString(String(input.city)) : "",
    region: requireNonEmpty(input.region) ? normalizeString(String(input.region)) : undefined,
    postalCode: requireNonEmpty(input.postalCode) ? normalizeString(String(input.postalCode)) : undefined,
    countryCode: requireNonEmpty(input.countryCode) ? normalizeString(String(input.countryCode)).toUpperCase() : "GB",
    industryType,
    serviceStationsCount: Number(input.serviceStationsCount),
    openingHoursNote: normalizeString(String(input.openingHoursNote)),
    password: String(input.password),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    placeId: requireNonEmpty(input.placeId) ? normalizeString(String(input.placeId)) : undefined,
    geolocationSource,
    pinConfirmedAt
  };

  return { ok: true as const, data: normalized };
}

function serializeSignup(signup: BusinessSignup) {
  return {
    id: signup.id,
    createdAt: signup.createdAt.toISOString(),
    updatedAt: signup.updatedAt.toISOString(),
    approvalStatus: signup.approvalStatus,
    businessName: signup.businessName,
    ownerName: signup.ownerName,
    mobileNumber: signup.mobileNumber,
    email: signup.email,
    addressLine1: signup.addressLine1,
    addressLine2: signup.addressLine2,
    city: signup.city,
    region: signup.region,
    postalCode: signup.postalCode,
    countryCode: signup.countryCode,
    industryType: signup.industryType,
    serviceStationsCount: signup.serviceStationsCount,
    openingHoursNote: signup.openingHoursNote,
    latitude: signup.latitude,
    longitude: signup.longitude,
    placeId: signup.placeId,
    geolocationSource: signup.geolocationSource,
    pinConfirmedAt: signup.pinConfirmedAt.toISOString(),
    approvedAt: signup.approvedAt?.toISOString() ?? null,
    rejectedAt: signup.rejectedAt?.toISOString() ?? null,
    rejectionReason: signup.rejectionReason,
    approvedBusinessGroupId: signup.approvedBusinessGroupId,
    approvedLocationId: signup.approvedLocationId
  };
}

export async function createBusinessSignupRecord(input: NormalizedBusinessSignupInput) {
  const passwordHash = await hashPassword(input.password);

  const record = await prisma.businessSignup.create({
    data: {
      businessName: input.businessName,
      ownerName: input.ownerName,
      mobileNumber: input.mobileNumber,
      email: input.email,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      industryType: input.industryType,
      serviceStationsCount: input.serviceStationsCount,
      openingHoursNote: input.openingHoursNote,
      passwordHash,
      latitude: input.latitude,
      longitude: input.longitude,
      placeId: input.placeId,
      geolocationSource: input.geolocationSource,
      geolocationCapturedAt: new Date(),
      pinConfirmedAt: input.pinConfirmedAt
    }
  });

  return serializeSignup(record);
}

export async function listBusinessSignups(status?: ApprovalStatus) {
  const items = await prisma.businessSignup.findMany({
    where: status ? { approvalStatus: status } : undefined,
    orderBy: { createdAt: "desc" }
  });

  return items.map(serializeSignup);
}

export async function approveBusinessSignup(id: string) {
  const signup = await prisma.businessSignup.findUnique({
    where: { id }
  });

  if (!signup) {
    throw ApiError.notFound("Business signup not found.");
  }

  if (signup.approvalStatus !== ApprovalStatus.PENDING) {
    throw ApiError.conflict("Only pending signups can be approved.");
  }

  const groupSlug = await createUniqueSlug(signup.businessName, "group");
  const locationSlug = await createUniqueSlug(`${signup.businessName}-${signup.city}`, "location");

  const existingOwnerUser = await prisma.user.findUnique({ where: { email: signup.email } });
  if (!existingOwnerUser && !signup.passwordHash) {
    throw ApiError.conflict(
      "This signup was created before password collection was required. Ask the owner to submit a new signup."
    );
  }

  const [ownerFirstName, ...ownerLastNameParts] = signup.ownerName.trim().split(/\s+/);
  const ownerLastName = ownerLastNameParts.join(" ") || null;

  const result = await prisma.$transaction(async (tx) => {
    const businessGroup = await tx.businessGroup.create({
      data: {
        name: signup.businessName,
        slug: groupSlug,
        industryType: signup.industryType,
        approvalStatus: ApprovalStatus.APPROVED,
        notes: `Created from business signup ${signup.id}`
      }
    });

    const location = await tx.businessLocation.create({
      data: {
        businessGroupId: businessGroup.id,
        name: signup.businessName,
        slug: locationSlug,
        status: LocationStatus.LIVE,
        isPublic: true,
        phone: signup.mobileNumber,
        email: signup.email,
        addressLine1: signup.addressLine1,
        addressLine2: signup.addressLine2,
        city: signup.city,
        region: signup.region,
        postalCode: signup.postalCode,
        countryCode: signup.countryCode,
        latitude: signup.latitude,
        longitude: signup.longitude,
        placeId: signup.placeId,
        geolocationSource: signup.geolocationSource,
        geolocationCapturedAt: signup.geolocationCapturedAt ?? signup.createdAt,
        pinConfirmedAt: signup.pinConfirmedAt,
        serviceStationsCount: signup.serviceStationsCount,
        openingHours: { note: signup.openingHoursNote },
        onboardingCompletedAt: new Date(),
        approvedAt: new Date()
      }
    });

    await tx.service.create({
      data: {
        businessLocationId: location.id,
        name: "Standard service",
        category: signup.industryType.toString().toLowerCase().replace(/_/g, " "),
        description: "Default queueable service. Rename or split this into more services from your dashboard.",
        defaultDurationMin: 25,
        isQueueable: true,
        isBookable: false,
        isActive: true
      }
    });

    const owner = existingOwnerUser
      ? await tx.user.update({
          where: { id: existingOwnerUser.id },
          data: {
            firstName: existingOwnerUser.firstName || ownerFirstName || "Owner",
            lastName: existingOwnerUser.lastName ?? ownerLastName,
            phone: existingOwnerUser.phone || signup.mobileNumber
          }
        })
      : await tx.user.create({
          data: {
            appRole: AppRole.USER,
            firstName: ownerFirstName || "Owner",
            lastName: ownerLastName,
            email: signup.email,
            phone: signup.mobileNumber,
            passwordHash: signup.passwordHash!
          }
        });

    const existingMembership = await tx.businessMembership.findFirst({
      where: { businessGroupId: businessGroup.id, userId: owner.id }
    });

    if (!existingMembership) {
      await tx.businessMembership.create({
        data: {
          businessGroupId: businessGroup.id,
          userId: owner.id,
          role: MembershipRole.OWNER,
          acceptedAt: new Date()
        }
      });
    }

    const updatedSignup = await tx.businessSignup.update({
      where: { id: signup.id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvedBusinessGroupId: businessGroup.id,
        approvedLocationId: location.id,
        passwordHash: null
      }
    });

    return {
      businessGroup,
      location,
      signup: updatedSignup,
      owner
    };
  });

  return {
    signup: serializeSignup(result.signup),
    businessGroup: {
      id: result.businessGroup.id,
      name: result.businessGroup.name,
      slug: result.businessGroup.slug
    },
    location: {
      id: result.location.id,
      name: result.location.name,
      slug: result.location.slug
    },
    owner: {
      id: result.owner.id,
      email: result.owner.email,
      createdNewAccount: !existingOwnerUser
    }
  };
}

export async function rejectBusinessSignup(id: string, reason?: string) {
  const signup = await prisma.businessSignup.findUnique({
    where: { id }
  });

  if (!signup) {
    throw ApiError.notFound("Business signup not found.");
  }

  if (signup.approvalStatus !== ApprovalStatus.PENDING) {
    throw ApiError.conflict("Only pending signups can be rejected.");
  }

  const updatedSignup = await prisma.businessSignup.update({
    where: { id },
    data: {
      approvalStatus: ApprovalStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reason?.trim() || "Rejected during admin review."
    }
  });

  return serializeSignup(updatedSignup);
}
