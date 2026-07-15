import crypto from "node:crypto";

import { MembershipRole } from "@prisma/client";

import { recordAuthAuditEvent } from "./auth-audit";
import { ApiError } from "./core/api-error";
import { appConfig } from "./core/config";
import { hashPassword, validatePasswordStrength } from "./core/password";
import { prisma } from "./prisma";

function isInviteableRole(role: unknown): role is "MANAGER" | "STAFF_OPERATOR" | "ADMIN_SUPPORT" {
  return (
    role === MembershipRole.MANAGER ||
    role === MembershipRole.STAFF_OPERATOR ||
    role === MembershipRole.ADMIN_SUPPORT
  );
}

function normalizeString(value: string) {
  return value.trim();
}

function createInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildInvitationUrl(token: string) {
  return `${appConfig.appBaseUrl}/invite/${token}`;
}

export function validateCreateInvitationInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;

  if (typeof input.email !== "string" || input.email.trim().length === 0) {
    return { ok: false as const, error: "Email is required." };
  }

  if (typeof input.role !== "string" || !isInviteableRole(input.role)) {
    return { ok: false as const, error: "Role must be MANAGER, STAFF_OPERATOR, or ADMIN_SUPPORT." };
  }

  return {
    ok: true as const,
    data: {
      email: normalizeString(input.email).toLowerCase(),
      firstName:
        typeof input.firstName === "string" && input.firstName.trim().length > 0
          ? normalizeString(input.firstName)
          : undefined,
      lastName:
        typeof input.lastName === "string" && input.lastName.trim().length > 0
          ? normalizeString(input.lastName)
          : undefined,
      role: input.role as MembershipRole,
      note:
        typeof input.note === "string" && input.note.trim().length > 0 ? normalizeString(input.note) : undefined
    }
  };
}

export function validateAcceptInvitationInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;
  const minLength = appConfig.auth.passwordMinLength;

  if (typeof input.password !== "string" || input.password.length < minLength) {
    return { ok: false as const, error: `Password must be at least ${minLength} characters.` };
  }

  return {
    ok: true as const,
    data: {
      firstName:
        typeof input.firstName === "string" && input.firstName.trim().length > 0
          ? normalizeString(input.firstName)
          : undefined,
      lastName:
        typeof input.lastName === "string" && input.lastName.trim().length > 0
          ? normalizeString(input.lastName)
          : undefined,
      password: input.password
    }
  };
}

function assertInvitationPasswordStrength(password: string) {
  const result = validatePasswordStrength(password);

  if (!result.ok) {
    throw ApiError.badRequest(result.errors[0] ?? "Password does not meet policy requirements.", {
      passwordPolicyErrors: result.errors
    });
  }
}

function serializeInvitation(invitation: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: MembershipRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  note: string | null;
  createdAt: Date;
  businessGroup: {
    id: string;
    name: string;
    slug: string;
  };
  businessLocation: {
    id: string;
    name: string;
    slug: string;
  };
}) {
  return {
    id: invitation.id,
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    role: invitation.role,
    note: invitation.note,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    businessGroup: invitation.businessGroup,
    businessLocation: invitation.businessLocation
  };
}

export async function createBusinessInvitation(
  shopSlug: string,
  actorUserId: string,
  input: {
    email: string;
    firstName?: string;
    lastName?: string;
    role: MembershipRole;
    note?: string;
  }
) {
  const location = await prisma.businessLocation.findUnique({
    where: {
      slug: shopSlug
    },
    include: {
      businessGroup: true
    }
  });

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const existingMembership = await prisma.businessMembership.findFirst({
    where: {
      businessGroupId: location.businessGroupId,
      user: {
        email: input.email
      }
    }
  });

  if (existingMembership) {
    throw ApiError.conflict("That email already belongs to a member of this business.");
  }

  await prisma.businessInvitation.updateMany({
    where: {
      businessGroupId: location.businessGroupId,
      email: input.email,
      acceptedAt: null,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  const rawToken = createInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.businessInvitation.create({
    data: {
      businessGroupId: location.businessGroupId,
      businessLocationId: location.id,
      invitedByUserId: actorUserId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      tokenHash,
      expiresAt,
      note: input.note
    },
    include: {
      businessGroup: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      businessLocation: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  await recordAuthAuditEvent({
    userId: actorUserId,
    type: "INVITATION_CREATED",
    identifier: input.email,
    metadata: {
      invitationId: invitation.id,
      businessGroupId: invitation.businessGroup.id,
      businessLocationId: invitation.businessLocation.id,
      role: invitation.role
    }
  });

  return {
    ...serializeInvitation(invitation),
    inviteToken: rawToken,
    inviteUrl: buildInvitationUrl(rawToken)
  };
}

export async function listBusinessInvitations(shopSlug: string) {
  const location = await prisma.businessLocation.findUnique({
    where: {
      slug: shopSlug
    }
  });

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const invitations = await prisma.businessInvitation.findMany({
    where: {
      businessLocationId: location.id,
      revokedAt: null
    },
    include: {
      businessGroup: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      businessLocation: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return invitations.map(serializeInvitation);
}

async function findInvitationByRawToken(rawToken: string) {
  const tokenHash = hashInviteToken(rawToken);
  return prisma.businessInvitation.findUnique({
    where: {
      tokenHash
    },
    include: {
      businessGroup: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      businessLocation: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });
}

export async function getInvitationByToken(rawToken: string) {
  const invitation = await findInvitationByRawToken(rawToken);

  if (!invitation) {
    throw ApiError.notFound("Invitation not found.");
  }

  if (invitation.revokedAt) {
    throw ApiError.conflict("Invitation has been revoked.");
  }

  if (invitation.acceptedAt) {
    throw ApiError.conflict("Invitation has already been accepted.");
  }

  if (invitation.expiresAt.getTime() <= Date.now()) {
    throw ApiError.conflict("Invitation has expired.");
  }

  return serializeInvitation(invitation);
}

export async function acceptInvitationByToken(
  rawToken: string,
  input: {
    firstName?: string;
    lastName?: string;
    password: string;
  }
) {
  assertInvitationPasswordStrength(input.password);

  const invitation = await findInvitationByRawToken(rawToken);

  if (!invitation) {
    throw ApiError.notFound("Invitation not found.");
  }

  if (invitation.revokedAt) {
    throw ApiError.conflict("Invitation has been revoked.");
  }

  if (invitation.acceptedAt) {
    throw ApiError.conflict("Invitation has already been accepted.");
  }

  if (invitation.expiresAt.getTime() <= Date.now()) {
    throw ApiError.conflict("Invitation has expired.");
  }

  const passwordHash = await hashPassword(input.password);
  const acceptedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        email: invitation.email
      },
      update: {
        firstName: input.firstName ?? invitation.firstName ?? "Q-App",
        lastName: input.lastName ?? invitation.lastName,
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null
      },
      create: {
        firstName: input.firstName ?? invitation.firstName ?? "Q-App",
        lastName: input.lastName ?? invitation.lastName,
        email: invitation.email,
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    const membership = await tx.businessMembership.findFirst({
      where: {
        businessGroupId: invitation.businessGroupId,
        userId: user.id
      }
    });

    if (membership) {
      await tx.businessMembership.update({
        where: {
          id: membership.id
        },
        data: {
          role: invitation.role,
          invitedAt: membership.invitedAt ?? invitation.createdAt,
          acceptedAt
        }
      });
    } else {
      await tx.businessMembership.create({
        data: {
          businessGroupId: invitation.businessGroupId,
          userId: user.id,
          role: invitation.role,
          invitedAt: invitation.createdAt,
          acceptedAt
        }
      });
    }

    if (invitation.role === MembershipRole.MANAGER || invitation.role === MembershipRole.STAFF_OPERATOR) {
      const existingStaffMember = await tx.staffMember.findFirst({
        where: {
          businessLocationId: invitation.businessLocationId,
          userId: user.id
        }
      });

      if (!existingStaffMember) {
        await tx.staffMember.create({
          data: {
            businessLocationId: invitation.businessLocationId,
            userId: user.id,
            displayName: `${input.firstName ?? invitation.firstName ?? "Q-App"}${
              input.lastName ?? invitation.lastName ? ` ${input.lastName ?? invitation.lastName}` : ""
            }`,
            skillTags: invitation.role === MembershipRole.MANAGER ? ["queue", "management"] : ["queue"]
          }
        });
      }
    }

    const updatedInvitation = await tx.businessInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        acceptedAt,
        acceptedByUserId: user.id
      },
      include: {
        businessGroup: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        businessLocation: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    return {
      invitation: updatedInvitation,
      user
    };
  });

  await recordAuthAuditEvent({
    userId: result.user.id,
    type: "INVITATION_ACCEPTED",
    identifier: result.user.email ?? invitation.email,
    metadata: {
      invitationId: result.invitation.id,
      businessGroupId: result.invitation.businessGroup.id,
      businessLocationId: result.invitation.businessLocation.id,
      role: result.invitation.role
    }
  });

  return {
    invitation: serializeInvitation(result.invitation),
    acceptedUser: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName
    }
  };
}
