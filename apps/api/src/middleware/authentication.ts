import type { NextFunction, Request, Response } from "express";
import { AppRole, MembershipRole } from "@prisma/client";

import { ApiError } from "../core/api-error";
import { verifyAccessToken } from "../core/token";
import { prisma } from "../prisma";

type AuthContext = {
  userId: string;
  sessionId: string;
  appRole: AppRole;
};

function getBearerToken(req: Request) {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export function getAuthContext(res: Response) {
  return res.locals.auth as AuthContext | undefined;
}

export async function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      throw new ApiError(401, "Access token is invalid or expired.", "UNAUTHORIZED");
    }

    const session = await prisma.authSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!session) {
      throw new ApiError(401, "Session is no longer active.", "UNAUTHORIZED");
    }

    res.locals.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      appRole: payload.role as AppRole
    } satisfies AuthContext;

    next();
  } catch (error) {
    next(error);
  }
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuthContext(res);

  if (!auth || auth.appRole !== AppRole.PLATFORM_ADMIN) {
    next(new ApiError(403, "Platform admin access required.", "FORBIDDEN"));
    return;
  }

  next();
}

export function requireBusinessRoles(allowedRoles: MembershipRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      if (auth.appRole === AppRole.PLATFORM_ADMIN) {
        next();
        return;
      }

      const slug = typeof req.params.slug === "string" ? req.params.slug : "";

      if (!slug) {
        throw ApiError.badRequest("Shop slug is required.");
      }

      const location = await prisma.businessLocation.findUnique({
        where: {
          slug
        },
        select: {
          businessGroupId: true
        }
      });

      if (!location) {
        throw ApiError.notFound("Shop not found.");
      }

      const membership = await prisma.businessMembership.findFirst({
        where: {
          userId: auth.userId,
          businessGroupId: location.businessGroupId,
          role: {
            in: allowedRoles
          }
        }
      });

      if (!membership) {
        throw new ApiError(403, "Business role does not allow this action.", "FORBIDDEN");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
