import { LocationStatus } from "@prisma/client";

import { ApiError } from "./core/api-error";
import { prisma } from "./prisma";
import { emptyReviewSummary, loadReviewSummaries } from "./reviews";
import { enrichShopDiscoveryItems, serializeShopBase } from "./shops";

export function normalizeDeviceKey(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^[A-Za-z0-9._:-]{16,120}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export async function touchPreferenceProfile(deviceKey: string) {
  return prisma.customerPreferenceProfile.upsert({
    where: {
      deviceKey
    },
    update: {
      lastSeenAt: new Date()
    },
    create: {
      deviceKey,
      lastSeenAt: new Date()
    }
  });
}

export async function loadFavoriteLocationIds(deviceKey?: string | null) {
  if (!deviceKey) {
    return new Set<string>();
  }

  const profile = await touchPreferenceProfile(deviceKey);
  const favorites = await prisma.favoriteBusinessLocation.findMany({
    where: {
      preferenceProfileId: profile.id
    },
    select: {
      businessLocationId: true
    }
  });

  return new Set(favorites.map((favorite) => favorite.businessLocationId));
}

export async function listFavoriteShops(options: {
  deviceKey: string;
  latitude?: number;
  longitude?: number;
}) {
  const profile = await touchPreferenceProfile(options.deviceKey);
  const favorites = await prisma.favoriteBusinessLocation.findMany({
    where: {
      preferenceProfileId: profile.id,
      businessLocation: {
        isPublic: true,
        status: LocationStatus.LIVE
      }
    },
    include: {
      businessLocation: {
        include: {
          businessGroup: {
            select: {
              industryType: true,
              approvalStatus: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const baseItems = favorites.map((favorite) => ({
    ...serializeShopBase(favorite.businessLocation, {
      latitude: options.latitude,
      longitude: options.longitude
    }),
    favoriteSince: favorite.createdAt.toISOString()
  }));
  const enriched = await enrichShopDiscoveryItems(baseItems);
  const reviewSummaries = await loadReviewSummaries(enriched.map((item) => item.id));

  return enriched.map(({ sortDistance: _sortDistance, defaultWalkInDurationMin: _duration, ...item }) => ({
    ...item,
    isFavorite: true,
    reviewSummary: reviewSummaries.get(item.id) ?? emptyReviewSummary()
  }));
}

export async function setFavoriteShop(deviceKey: string, shopSlug: string, isFavorite: boolean) {
  const [profile, location] = await Promise.all([
    touchPreferenceProfile(deviceKey),
    prisma.businessLocation.findFirst({
      where: {
        slug: shopSlug,
        isPublic: true,
        status: LocationStatus.LIVE
      },
      select: {
        id: true,
        slug: true
      }
    })
  ]);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  if (isFavorite) {
    await prisma.favoriteBusinessLocation.upsert({
      where: {
        preferenceProfileId_businessLocationId: {
          preferenceProfileId: profile.id,
          businessLocationId: location.id
        }
      },
      update: {},
      create: {
        preferenceProfileId: profile.id,
        businessLocationId: location.id
      }
    });
  } else {
    await prisma.favoriteBusinessLocation.deleteMany({
      where: {
        preferenceProfileId: profile.id,
        businessLocationId: location.id
      }
    });
  }

  return {
    slug: location.slug,
    isFavorite
  };
}
