import { LocationStatus } from "@prisma/client";

import { prisma } from "./prisma";
import { emptyReviewSummary, loadPublicReviewComments, loadReviewSummaries, loadReviewSummary } from "./reviews";

function roundDistance(distanceKm: number) {
  return Math.round(distanceKm * 10) / 10;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLatitude - fromLatitude);
  const dLon = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function calculateBestJoinScore(distanceKm: number | null, estimatedWaitMin: number) {
  const distancePenalty = typeof distanceKm === "number" ? distanceKm * 8 : 12;
  return Math.round((estimatedWaitMin + distancePenalty) * 10) / 10;
}

function getBestJoinReason(distanceKm: number | null, estimatedWaitMin: number) {
  if (typeof distanceKm === "number" && distanceKm <= 1 && estimatedWaitMin <= 15) {
    return "Closest quick option";
  }

  if (estimatedWaitMin <= 10) {
    return "Shortest wait nearby";
  }

  if (typeof distanceKm === "number" && distanceKm <= 2) {
    return "Nearby with a predictable queue";
  }

  return "Balanced by distance and live wait";
}

export function serializeShopBase(
  location: {
    id: string;
    slug: string;
    name: string;
    city: string;
    region: string | null;
    countryCode: string;
    addressLine1: string;
    postalCode: string | null;
    latitude: number;
    longitude: number;
    publicDescription: string | null;
    logoImageUrl: string | null;
    coverImageUrl: string | null;
    serviceStationsCount: number;
    queueEnabled: boolean;
    queuePaused: boolean;
    defaultWalkInDurationMin: number;
    businessGroup: {
      industryType: string;
      approvalStatus: string;
    };
  },
  options?: {
    latitude?: number;
    longitude?: number;
  }
) {
  const rawDistanceKm =
    typeof options?.latitude === "number" && typeof options?.longitude === "number"
      ? calculateDistanceKm(options.latitude, options.longitude, location.latitude, location.longitude)
      : undefined;

  return {
    id: location.id,
    slug: location.slug,
    name: location.name,
    city: location.city,
    region: location.region,
    countryCode: location.countryCode,
    addressLine1: location.addressLine1,
    postalCode: location.postalCode,
    latitude: location.latitude,
    longitude: location.longitude,
    publicDescription: location.publicDescription,
    logoImageUrl: location.logoImageUrl,
    coverImageUrl: location.coverImageUrl,
    serviceStationsCount: location.serviceStationsCount,
    queueEnabled: location.queueEnabled,
    queuePaused: location.queuePaused,
    defaultWalkInDurationMin: location.defaultWalkInDurationMin,
    industryType: location.businessGroup.industryType,
    approvalStatus: location.businessGroup.approvalStatus,
    distanceKm: typeof rawDistanceKm === "number" ? roundDistance(rawDistanceKm) : null,
    sortDistance: rawDistanceKm ?? Number.POSITIVE_INFINITY
  };
}

async function loadQueueSummary(locationId: string, defaultDurationMin: number, stationsCount: number) {
  const activeQueueCount = await prisma.queueEntry.count({
    where: {
      businessLocationId: locationId,
      removedAt: null,
      releasedAt: null,
      missedAt: null,
      visit: {
        status: {
          in: ["QUEUED", "CONFIRMATION_PENDING", "CALLED", "READY"]
        }
      }
    }
  });

  const estimatedWaitMin = Math.max(
    0,
    Math.ceil((activeQueueCount * defaultDurationMin) / Math.max(stationsCount, 1))
  );

  return {
    queueLength: activeQueueCount,
    estimatedWaitMin
  };
}

export async function enrichShopDiscoveryItems<
  T extends {
    id: string;
    defaultWalkInDurationMin: number;
    serviceStationsCount: number;
    distanceKm: number | null;
  }
>(items: T[]) {
  return Promise.all(
    items.map(async (item) => {
      const queueSummary = await loadQueueSummary(item.id, item.defaultWalkInDurationMin, item.serviceStationsCount);

      return {
        ...item,
        ...queueSummary,
        bestJoinScore: calculateBestJoinScore(item.distanceKm, queueSummary.estimatedWaitMin),
        bestJoinReason: getBestJoinReason(item.distanceKm, queueSummary.estimatedWaitMin)
      };
    })
  );
}

export async function listApprovedShops(options?: {
  latitude?: number;
  longitude?: number;
  limit?: number;
  favoriteLocationIds?: Set<string>;
}) {
  const locations = await prisma.businessLocation.findMany({
    where: {
      isPublic: true,
      status: LocationStatus.LIVE
    },
    include: {
      businessGroup: {
        select: {
          industryType: true,
          approvalStatus: true
        }
      }
    },
    take: options?.limit ?? 50
  });

  const items = locations.map((location) =>
    serializeShopBase(location, {
      latitude: options?.latitude,
      longitude: options?.longitude
    })
  );
  const withQueueSummary = await enrichShopDiscoveryItems(items);
  const reviewSummaries = await loadReviewSummaries(withQueueSummary.map((item) => item.id));
  const withReviews = withQueueSummary.map((item) => ({
    ...item,
    reviewSummary: reviewSummaries.get(item.id) ?? emptyReviewSummary(),
    isFavorite: options?.favoriteLocationIds?.has(item.id) ?? false
  }));

  if (typeof options?.latitude === "number" && typeof options?.longitude === "number") {
    withReviews.sort((left, right) => left.bestJoinScore - right.bestJoinScore || left.sortDistance - right.sortDistance);
  } else {
    withReviews.sort((left, right) => left.estimatedWaitMin - right.estimatedWaitMin || left.name.localeCompare(right.name));
  }

  return withReviews.map(({ sortDistance: _sortDistance, defaultWalkInDurationMin: _duration, ...item }) => item);
}

export async function getApprovedShopBySlug(slug: string) {
  const location = await prisma.businessLocation.findFirst({
    where: {
      slug,
      isPublic: true,
      status: LocationStatus.LIVE
    },
    include: {
      businessGroup: {
        select: {
          industryType: true,
          approvalStatus: true
        }
      }
    }
  });

  if (!location) {
    return null;
  }

  return {
    ...serializeShopBase(location),
    ...(await loadQueueSummary(location.id, location.defaultWalkInDurationMin, location.serviceStationsCount)),
    bestJoinScore: 0,
    bestJoinReason: "Selected shop",
    isFavorite: false,
    reviewSummary: await loadReviewSummary(location.id),
    reviews: await loadPublicReviewComments(location.id)
  };
}
