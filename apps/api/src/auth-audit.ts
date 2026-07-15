import { type AuthEventType, type Prisma } from "@prisma/client";

import { prisma } from "./prisma";

type AuditClient = Prisma.TransactionClient | typeof prisma;

type RecordAuthAuditEventInput = {
  userId?: string;
  actorUserId?: string;
  sessionId?: string;
  type: AuthEventType;
  identifier?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  platform?: string;
  metadata?: Prisma.InputJsonValue;
};

type SerializedAuthAuditEvent = {
  id: string;
  createdAt: string;
  type: AuthEventType;
  identifier: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  platform: string | null;
  metadata: Prisma.JsonValue | null;
  sessionId: string | null;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string | null;
  } | null;
  actorUser: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string | null;
  } | null;
};

function serializeAuthAuditEvent(event: {
  id: string;
  createdAt: Date;
  type: AuthEventType;
  identifier: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  platform: string | null;
  metadata: Prisma.JsonValue | null;
  sessionId: string | null;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string | null;
  } | null;
  actorUser: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string | null;
  } | null;
}): SerializedAuthAuditEvent {
  return {
    id: event.id,
    createdAt: event.createdAt.toISOString(),
    type: event.type,
    identifier: event.identifier,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    deviceName: event.deviceName,
    platform: event.platform,
    metadata: event.metadata,
    sessionId: event.sessionId,
    user: event.user,
    actorUser: event.actorUser
  };
}

export async function recordAuthAuditEvent(input: RecordAuthAuditEventInput, client: AuditClient = prisma) {
  return client.authAuditEvent.create({
    data: {
      userId: input.userId,
      actorUserId: input.actorUserId,
      sessionId: input.sessionId,
      type: input.type,
      identifier: input.identifier,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceName: input.deviceName,
      platform: input.platform,
      metadata: input.metadata
    }
  });
}

export async function listAuthAuditEvents(userId: string, limit = 25) {
  const events = await prisma.authAuditEvent.findMany({
    where: {
      userId
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true
        }
      },
      actorUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: Math.min(Math.max(limit, 1), 100)
  });

  return events.map(serializeAuthAuditEvent);
}

export async function listAdminAuthAuditEvents(input: {
  userId?: string;
  identifier?: string;
  type?: AuthEventType;
  limit?: number;
}) {
  const events = await prisma.authAuditEvent.findMany({
    where: {
      userId: input.userId,
      type: input.type,
      identifier: input.identifier
        ? {
            contains: input.identifier,
            mode: "insensitive"
          }
        : undefined
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true
        }
      },
      actorUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: Math.min(Math.max(input.limit ?? 50, 1), 200)
  });

  return events.map(serializeAuthAuditEvent);
}
