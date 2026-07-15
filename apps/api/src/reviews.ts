import { prisma } from "./prisma";

type ReviewRow = {
  id: string;
  rating: number | null;
  comment: string | null;
  createdAt: Date;
  customer: {
    firstName: string;
  };
};

type CreateCustomerReviewInput = {
  businessLocationId: string;
  visitId: string;
  customerId: string;
  rating?: number;
  comment?: string;
};

function roundRating(value: number | null | undefined) {
  return typeof value === "number" ? Math.round(value * 10) / 10 : null;
}

function logReviewStoreError(error: unknown) {
  console.warn("Customer reviews are temporarily unavailable.", error);
}

export function emptyReviewSummary() {
  return {
    averageRating: null as number | null,
    ratingCount: 0
  };
}

export function serializeReview(review: ReviewRow) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    customerName: review.customer.firstName
  };
}

export async function loadReviewSummaries(businessLocationIds: string[]) {
  const summaries = new Map(businessLocationIds.map((id) => [id, emptyReviewSummary()]));

  if (businessLocationIds.length === 0) {
    return summaries;
  }

  try {
    const grouped = await prisma.customerReview.groupBy({
      by: ["businessLocationId"],
      where: {
        businessLocationId: {
          in: businessLocationIds
        },
        isPublic: true,
        rating: {
          not: null
        }
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      }
    });

    for (const item of grouped) {
      summaries.set(item.businessLocationId, {
        averageRating: roundRating(item._avg.rating),
        ratingCount: item._count.rating
      });
    }
  } catch (error) {
    logReviewStoreError(error);
  }

  return summaries;
}

export async function hasCustomerReviewForVisit(visitId: string) {
  try {
    const review = await prisma.customerReview.findUnique({
      where: {
        visitId
      },
      select: {
        id: true
      }
    });
    return Boolean(review);
  } catch (error) {
    logReviewStoreError(error);
    return false;
  }
}

export async function createCustomerReview(input: CreateCustomerReviewInput) {
  try {
    await prisma.customerReview.create({
      data: {
        businessLocationId: input.businessLocationId,
        visitId: input.visitId,
        customerId: input.customerId,
        rating: input.rating ?? null,
        comment: input.comment ?? null,
        isPublic: true
      }
    });

    return true;
  } catch (error) {
    logReviewStoreError(error);
    return false;
  }
}

export async function loadReviewSummary(businessLocationId: string) {
  const summaries = await loadReviewSummaries([businessLocationId]);
  return summaries.get(businessLocationId) ?? emptyReviewSummary();
}

export async function loadPublicReviewComments(businessLocationId: string, limit = 50) {
  try {
    const reviews = await prisma.customerReview.findMany({
      where: {
        businessLocationId,
        isPublic: true,
        comment: {
          not: null
        }
      },
      include: {
        customer: {
          select: {
            firstName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    return reviews.map(serializeReview);
  } catch (error) {
    logReviewStoreError(error);
    return [];
  }
}

export async function loadRecentReviews(businessLocationId: string, limit = 10) {
  try {
    const reviews = await prisma.customerReview.findMany({
      where: {
        businessLocationId
      },
      include: {
        customer: {
          select: {
            firstName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    return reviews.map(serializeReview);
  } catch (error) {
    logReviewStoreError(error);
    return [];
  }
}

export async function countPublicReviewComments(businessLocationId: string) {
  try {
    return prisma.customerReview.count({
      where: {
        businessLocationId,
        isPublic: true,
        comment: {
          not: null
        }
      }
    });
  } catch (error) {
    logReviewStoreError(error);
    return 0;
  }
}
