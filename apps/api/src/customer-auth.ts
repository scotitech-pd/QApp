import crypto from "node:crypto";

import { ApiError } from "./core/api-error";
import { appConfig } from "./core/config";
import { prisma } from "./prisma";

/* Optional customer accounts (Sign in with Apple / Google).
 * Joining a queue never requires an account; accounts unlock visit history,
 * favourites and prefilled rejoin. Phone-based records are merged into the
 * account when the customer claims a visit (see claimVisit). */

const CUSTOMER_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function createCustomerToken(customerId: string) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ cid: customerId, typ: "customer", iat: now, exp: now + CUSTOMER_TOKEN_TTL_SECONDS }));
  const signature = base64url(crypto.createHmac("sha256", appConfig.auth.accessTokenSecret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

export function verifyCustomerToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = base64url(crypto.createHmac("sha256", appConfig.auth.accessTokenSecret).update(`${header}.${payload}`).digest());
  if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const claims = JSON.parse(fromBase64url(payload).toString("utf8")) as { cid?: string; typ?: string; exp?: number };
    if (claims.typ !== "customer" || !claims.cid || !claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims.cid;
  } catch {
    return null;
  }
}

// ---------- Apple ----------

let appleKeysCache: { fetchedAt: number; keys: Array<Record<string, string>> } | null = null;

async function appleJwks() {
  if (appleKeysCache && Date.now() - appleKeysCache.fetchedAt < 60 * 60 * 1000) return appleKeysCache.keys;
  const response = await fetch("https://appleid.apple.com/auth/keys");
  const body = (await response.json()) as { keys: Array<Record<string, string>> };
  appleKeysCache = { fetchedAt: Date.now(), keys: body.keys };
  return body.keys;
}

export async function verifyAppleIdentityToken(identityToken: string) {
  const parts = identityToken.split(".");
  if (parts.length !== 3) throw ApiError.badRequest("Invalid Apple identity token.");
  let header: { kid: string; alg: string };
  let claims: { iss: string; aud: string; exp: number; sub: string; email?: string };
  try {
    header = JSON.parse(fromBase64url(parts[0]).toString("utf8"));
    claims = JSON.parse(fromBase64url(parts[1]).toString("utf8"));
  } catch {
    throw ApiError.badRequest("Invalid Apple identity token.");
  }

  const jwk = (await appleJwks()).find((key) => key.kid === header.kid);
  if (!jwk) throw ApiError.unauthorized("Apple signing key not found.");

  const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: "jwk" });
  const valid = crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, fromBase64url(parts[2]));
  if (!valid) throw ApiError.unauthorized("Apple identity token signature is invalid.");

  const expectedAudience = process.env.APPLE_CLIENT_ID ?? "com.scotitech.qapp";
  if (claims.iss !== "https://appleid.apple.com" || claims.aud !== expectedAudience) {
    throw ApiError.unauthorized("Apple identity token was not issued for OnQ.");
  }
  if (claims.exp * 1000 < Date.now()) throw ApiError.unauthorized("Apple identity token has expired.");

  return { providerId: claims.sub, email: claims.email ?? null };
}

// ---------- Google ----------

export async function verifyGoogleIdToken(idToken: string) {
  const allowed = (process.env.GOOGLE_OAUTH_CLIENT_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (allowed.length === 0) throw ApiError.conflict("Google sign-in is not configured yet.");

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) throw ApiError.unauthorized("Google token could not be verified.");
  const info = (await response.json()) as {
    aud: string;
    sub: string;
    email?: string;
    email_verified?: string;
    given_name?: string;
    picture?: string;
    exp: string;
  };

  if (!allowed.includes(info.aud)) throw ApiError.unauthorized("Google token was not issued for OnQ.");
  if (Number(info.exp) * 1000 < Date.now()) throw ApiError.unauthorized("Google token has expired.");

  return {
    providerId: info.sub,
    email: info.email_verified === "true" ? info.email ?? null : null,
    firstName: info.given_name ?? null,
    avatarUrl: typeof info.picture === "string" && info.picture.startsWith("https://") ? info.picture : null
  };
}

// ---------- Account resolution ----------

export async function signInCustomer(
  provider: "apple" | "google",
  identity: { providerId: string; email: string | null; firstName?: string | null; avatarUrl?: string | null }
) {
  const providerField = provider === "apple" ? "appleUserId" : "googleUserId";

  let customer = await prisma.customer.findFirst({ where: { [providerField]: identity.providerId, deletedAt: null } });

  if (!customer && identity.email) {
    customer = await prisma.customer.findFirst({ where: { email: identity.email, deletedAt: null } });
  }

  const firstName = identity.firstName?.trim() || customer?.firstName || "Guest";
  const avatarUrl = identity.avatarUrl ?? customer?.avatarUrl ?? null;

  customer = customer
    ? await prisma.customer.update({
        where: { id: customer.id },
        data: { [providerField]: identity.providerId, email: customer.email ?? identity.email, firstName, avatarUrl, lastSignInAt: new Date() }
      })
    : await prisma.customer.create({
        data: { firstName, email: identity.email, avatarUrl, [providerField]: identity.providerId, lastSignInAt: new Date() }
      });

  return { token: createCustomerToken(customer.id), profile: serializeCustomer(customer) };
}

function serializeCustomer(customer: {
  id: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  appleUserId: string | null;
  googleUserId: string | null;
}) {
  return {
    id: customer.id,
    firstName: customer.firstName,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    memberSince: customer.createdAt.toISOString(),
    providers: [customer.appleUserId ? "apple" : null, customer.googleUserId ? "google" : null].filter(Boolean)
  };
}

async function requireLiveCustomer(customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) throw ApiError.unauthorized("Account not found.");
  return customer;
}

export async function getCustomerProfile(customerId: string) {
  const customer = await requireLiveCustomer(customerId);
  const [visits, ratings, favorites] = await Promise.all([
    prisma.visit.count({ where: { customerId, status: "COMPLETED" } }),
    prisma.customerReview.count({ where: { customerId } }),
    prisma.favoriteBusinessLocation.count({ where: { profile: { customerId } } })
  ]);
  return { ...serializeCustomer(customer), stats: { visits, ratings, favorites } };
}

export async function updateCustomerProfile(customerId: string, input: { firstName?: unknown }) {
  await requireLiveCustomer(customerId);
  const firstName = typeof input.firstName === "string" ? input.firstName.trim().slice(0, 40) : "";
  if (!firstName) throw ApiError.badRequest("Name is required.");
  await prisma.customer.update({ where: { id: customerId }, data: { firstName } });
  return getCustomerProfile(customerId);
}

/** Attach this device's favourites profile to the signed-in account. */
export async function linkDeviceToCustomer(customerId: string, deviceKey: string) {
  await requireLiveCustomer(customerId);
  await prisma.customerPreferenceProfile.upsert({
    where: { deviceKey },
    update: { customerId, lastSeenAt: new Date() },
    create: { deviceKey, customerId, lastSeenAt: new Date() }
  });
  return { linked: true };
}

/**
 * Store-compliant account deletion (App Store 5.1.1(v), Play account-deletion
 * policy): personal data is scrubbed and sign-in links removed immediately.
 * Visit rows stay, anonymised, so shops' service history remains truthful.
 */
export async function deleteCustomerAccount(customerId: string) {
  await requireLiveCustomer(customerId);
  await prisma.$transaction(async (tx) => {
    const profiles = await tx.customerPreferenceProfile.findMany({ where: { customerId }, select: { id: true } });
    const profileIds = profiles.map((profile) => profile.id);
    if (profileIds.length > 0) {
      await tx.favoriteBusinessLocation.deleteMany({ where: { preferenceProfileId: { in: profileIds } } });
      await tx.customerPreferenceProfile.deleteMany({ where: { id: { in: profileIds } } });
    }
    await tx.queueEntry.updateMany({ where: { visit: { customerId } }, data: { pushToken: null } });
    await tx.customerReview.updateMany({ where: { customerId }, data: { isPublic: false } });
    await tx.verificationChallenge.deleteMany({ where: { customerId } });
    await tx.customer.update({
      where: { id: customerId },
      data: {
        firstName: "Deleted user",
        phone: null,
        email: null,
        avatarUrl: null,
        appleUserId: null,
        googleUserId: null,
        phoneVerifiedAt: null,
        marketingOptInAt: null,
        deletedAt: new Date()
      }
    });
  });
  return { deleted: true };
}

export async function getCustomerHistory(customerId: string) {
  const visits = await prisma.visit.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      businessLocation: { select: { name: true, slug: true, city: true } },
      customerReview: { select: { rating: true } }
    }
  });

  return visits.map((visit) => ({
    id: visit.id,
    shopName: visit.businessLocation.name,
    shopSlug: visit.businessLocation.slug,
    city: visit.businessLocation.city,
    status: visit.status,
    source: visit.source,
    joinedAt: (visit.queueJoinedAt ?? visit.createdAt).toISOString(),
    completedAt: visit.completedAt?.toISOString() ?? null,
    rating: visit.customerReview?.rating ?? null
  }));
}

/** Merge the phone-based record behind a visit into the signed-in account. */
export async function claimVisit(customerId: string, trackingToken: string) {
  const entry = await prisma.queueEntry.findUnique({
    where: { trackingToken },
    include: { visit: { include: { customer: true } } }
  });
  if (!entry) throw ApiError.notFound("Queue place not found.");

  const phoneCustomer = entry.visit.customer;
  if (phoneCustomer.id === customerId) return getCustomerProfile(customerId);

  await prisma.$transaction(async (tx) => {
    const account = await tx.customer.findUnique({ where: { id: customerId } });
    if (!account) throw ApiError.unauthorized("Account not found.");

    await tx.visit.updateMany({ where: { customerId: phoneCustomer.id }, data: { customerId } });
    await tx.customerReview.updateMany({ where: { customerId: phoneCustomer.id }, data: { customerId } });
    await tx.notificationEvent.updateMany({ where: { customerId: phoneCustomer.id }, data: { customerId } });
    await tx.verificationChallenge.updateMany({ where: { customerId: phoneCustomer.id }, data: { customerId } });
    await tx.customerPreferenceProfile.updateMany({ where: { customerId: phoneCustomer.id }, data: { customerId } });

    const phone = phoneCustomer.phone;
    await tx.customer.delete({ where: { id: phoneCustomer.id } });
    if (phone && !account.phone) {
      await tx.customer.update({ where: { id: customerId }, data: { phone, phoneVerifiedAt: phoneCustomer.phoneVerifiedAt } });
    }
  });

  return getCustomerProfile(customerId);
}
